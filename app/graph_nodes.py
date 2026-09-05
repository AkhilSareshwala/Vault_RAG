"""
VaultRAG v4 — Pipeline Graph Nodes & Builder
=============================================
Extracted from notebook 03 for reuse by main.py, mcp_server.py, and tests.
"""

import os
import json
import uuid
import pathlib
from typing import Optional

from dotenv import load_dotenv

project_root = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

# ---------------------------------------------------------------------------
# LLM client
# ---------------------------------------------------------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "qwen/qwen3.8-27b")

from openai import OpenAI

llm_client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")


def call_llm(prompt, max_tokens=700):
    response = llm_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0,
    )
    return response.choices[0].message.content


def call_llm_json(prompt, max_tokens=512):
    raw = call_llm(prompt, max_tokens=max_tokens)
    cleaned = raw.strip()
    for fence in ("```json", "```"):
        if cleaned.startswith(fence):
            cleaned = cleaned[len(fence):]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"error": "json_parse_failure", "raw": raw[:300]}


# ---------------------------------------------------------------------------
# AgentState
# ---------------------------------------------------------------------------
from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    query: str
    token: str
    role: str
    user_id: str
    token_valid: bool
    needs_sql: bool
    needs_policy: bool
    ticket_ref: Optional[str]
    sql_result: dict
    policy_results: list
    draft_email: str
    risk: dict
    approved: bool
    final_status: str
    thread_id: str
    nli_verdict: str
    nli_score: float
    nli_retried: bool


# ---------------------------------------------------------------------------
# Auth node — resolve role from verified JWT
# ---------------------------------------------------------------------------
from app.auth import verify_token
from langchain_core.messages import AIMessage


def resolve_role_node(state):
    """Entry point: verify the JWT and set role/user_id from verified claims only.

    Never trusts the caller — only verified claims are written to state.
    Invalid or missing tokens route to the reject node.
    """
    token = state.get("token", "")
    claims = verify_token(token)
    if claims is None:
        return {
            "token_valid": False,
            "role": "",
            "user_id": "",
            "messages": [AIMessage(content="Auth: token invalid or expired")],
        }
    return {
        "token_valid": True,
        "role": claims["role"],
        "user_id": claims["user_id"],
        "messages": [AIMessage(content=f"Auth: verified as {claims['user_id']} ({claims['role']})")],
    }


def route_after_auth(state):
    """Route to triage if token is valid, reject otherwise."""
    if state.get("token_valid"):
        return "triage_agent"
    return "reject_node"


def reject_node(state):
    """Terminal node for invalid tokens."""
    return {
        "final_status": "REJECTED: Invalid or expired token.",
        "messages": [AIMessage(content="Request rejected: authentication failed.")],
    }


# ---------------------------------------------------------------------------
# Policy corpus & search
# ---------------------------------------------------------------------------
POLICY_SNIPPETS = [
    "Standard return window: 30 days for general merchandise, 15 days for electronics.",
    "Approved refunds processed within 5-7 business days to original payment method.",
    "Shipping damage must be reported within 48 hours with photographic evidence.",
    "Goodwill refunds up to $150 may be approved by supervisors without VP sign-off.",
    "Customers with 3 or more refund requests in 90 days are flagged for abuse review.",
    "Items in original unused condition qualify for a full refund.",
    "Items showing signs of use may receive a partial refund of up to 50%.",
]


def simple_policy_search(query, top_k=3):
    """Keyword overlap search — stand-in for Qdrant hybrid search."""
    query_words = set(query.lower().split())
    scored = [(s, len(query_words & set(s.lower().split()))) for s in POLICY_SNIPPETS]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [s for s, score in scored[:top_k] if score > 0]


# ---------------------------------------------------------------------------
# Mock ticket database
# ---------------------------------------------------------------------------
MOCK_TICKETS = {
    "T1001": {"id": "T1001", "customer_name": "Alice Smith",
              "region": "us-east", "support_agent_id": "dave",
              "disputed_balance": 45.00, "ticket_status": "open",
              "issue_summary": "Refund not received after 30 days"},
    "T1005": {"id": "T1005", "customer_name": "Bob Johnson",
              "region": "us-west", "support_agent_id": "dave",
              "disputed_balance": 150.00, "ticket_status": "pending",
              "issue_summary": "Wrong item shipped, wants full refund"},
    "T1010": {"id": "T1010", "customer_name": "Carol White",
              "region": "eu-west", "support_agent_id": "dave",
              "disputed_balance": 275.00, "ticket_status": "escalated",
              "issue_summary": "Damaged goods, subscription charge after cancellation"},
}


def parameterized_ticket_lookup(ticket_ref, agent_id):
    """Look up a ticket using parameterized values."""
    if not ticket_ref:
        results = [t for t in MOCK_TICKETS.values() if t["support_agent_id"] == agent_id]
        return {"rows": results, "count": len(results)}

    ticket = MOCK_TICKETS.get(ticket_ref)
    if ticket and ticket["support_agent_id"] == agent_id:
        return {"rows": [ticket], "count": 1}
    elif ticket and ticket["support_agent_id"] != agent_id:
        return {"rows": [], "count": 0, "rls_blocked": True}
    return {"rows": [], "count": 0, "not_found": True}


# ---------------------------------------------------------------------------
# Agent nodes
# ---------------------------------------------------------------------------
def triage_agent(state):
    """Agent 1: classify intent and determine which evidence is needed."""
    prompt = f"""A support agent sent this message:
"{state['query']}"

Extract:
1. ticket_ref: The ticket ID (like T1001) if mentioned, otherwise null.
2. needs_sql: true if we need to look up ticket or order data from the database.
3. needs_policy: true if we need to check refund or return policy documents.

Return only valid JSON:
{{"ticket_ref": "T1001", "needs_sql": true, "needs_policy": true}}"""

    result = call_llm_json(prompt)
    return {
        "ticket_ref": result.get("ticket_ref"),
        "needs_sql": bool(result.get("needs_sql", True)),
        "needs_policy": bool(result.get("needs_policy", False)),
        "messages": [AIMessage(content=f"Triage complete: {result}")],
    }


def sql_agent(state):
    """Agent 2: look up ticket data using parameterized lookup."""
    if not state.get("needs_sql"):
        return {"sql_result": {}, "messages": [AIMessage(content="SQL: skipped")]}

    ticket_ref = state.get("ticket_ref")
    agent_id = state.get("user_id", "dave")

    prompt = f"""For this support query, what database lookup is needed?
Query: {state['query']}
Ticket reference: {ticket_ref}
Agent ID: {agent_id}

Return JSON: {{"query_type": "single_ticket" or "all_agent_tickets", "ticket_id": "{ticket_ref}"}}"""

    plan = call_llm_json(prompt)
    sql_result = parameterized_ticket_lookup(
        ticket_ref=plan.get("ticket_id") or ticket_ref,
        agent_id=agent_id,
    )

    return {
        "sql_result": sql_result,
        "messages": [AIMessage(content=f"SQL: found {sql_result['count']} ticket(s)")],
    }


def policy_agent(state):
    """Policy retrieval: keyword search, no AI call."""
    if not state.get("needs_policy"):
        return {"policy_results": [], "messages": [AIMessage(content="Policy: skipped")]}

    results = simple_policy_search(state["query"], top_k=3)
    return {
        "policy_results": results,
        "messages": [AIMessage(content=f"Policy: retrieved {len(results)} clauses")],
    }


def synthesizer_agent(state):
    """Agent 3: merge evidence and draft the resolution email."""
    context_parts = []

    sql = state.get("sql_result", {})
    if sql and sql.get("rows"):
        context_parts.append(f"[Ticket data]\n{json.dumps(sql['rows'], indent=2)}")

    for clause in state.get("policy_results", []):
        context_parts.append(f"[Policy clause]\n{clause}")

    if not context_parts:
        context_parts.append("No evidence found.")

    evidence = "\n\n".join(context_parts)

    prompt = f"""Write a short professional resolution email to the customer.
Use only the evidence provided below. Cite the ticket status and the policy basis.
If the evidence does not support a clear answer, say so honestly.
Keep the email under 150 words.

Evidence:
{evidence}

Support agent request: {state['query']}

Email:"""

    draft = call_llm(prompt, max_tokens=400)
    return {
        "draft_email": draft,
        "messages": [AIMessage(content=f"Synthesizer: email drafted ({len(draft)} chars)")],
    }


# ---------------------------------------------------------------------------
# NLI Verifier — checks draft against evidence using a pre-trained classifier
# ---------------------------------------------------------------------------
from sentence_transformers import CrossEncoder

_nli_model = None


def _get_nli_model():
    """Lazy-load the pre-trained NLI model."""
    global _nli_model
    if _nli_model is None:
        _nli_model = CrossEncoder("cross-encoder/nli-deberta-v3-small")
    return _nli_model


def verify_draft_node(state):
    """NLI verifier: check if the draft email is supported by the evidence.

    Uses a pre-trained cross-encoder NLI model (deberta-v3-small) to classify
    whether the draft follows from the retrieved evidence.

    Labels: 0 = contradiction, 1 = neutral, 2 = entailment.
    If the draft contradicts or is unsupported, retry once.
    """
    draft = state.get("draft_email", "")
    if not draft:
        return {
            "nli_verdict": "skip",
            "nli_score": 0.0,
            "messages": [AIMessage(content="NLI: no draft to verify")],
        }

    # Build evidence text
    evidence_parts = []
    sql = state.get("sql_result", {})
    if sql and sql.get("rows"):
        evidence_parts.append(json.dumps(sql["rows"], indent=2))
    for clause in state.get("policy_results", []):
        evidence_parts.append(clause)
    evidence = "\n".join(evidence_parts) if evidence_parts else "No evidence available."

    # Run NLI classification
    model = _get_nli_model()
    # Pair: (evidence, claim) — does the evidence support the claim (draft)?
    scores = model.predict([(evidence, draft)])
    # scores is array of [contradiction, neutral, entailment] logits
    import numpy as np
    probs = np.exp(scores) / np.exp(scores).sum(axis=1, keepdims=True)
    label_idx = int(probs[0].argmax())
    labels = ["contradiction", "entailment", "neutral"]
    verdict = labels[label_idx]
    confidence = float(probs[0][label_idx])

    # If contradiction or low entailment, retry once
    needs_retry = verdict == "contradiction" or (verdict == "neutral" and confidence > 0.7)

    if needs_retry and not state.get("nli_retried"):
        # Re-draft with explicit instruction
        context_parts = []
        if sql and sql.get("rows"):
            context_parts.append(f"[Ticket data]\n{json.dumps(sql['rows'], indent=2)}")
        for clause in state.get("policy_results", []):
            context_parts.append(f"[Policy clause]\n{clause}")
        evidence_text = "\n\n".join(context_parts) if context_parts else "No evidence found."

        retry_prompt = f"""Write a short professional resolution email to the customer.
IMPORTANT: Use ONLY the evidence provided below. Do NOT make claims not supported by the evidence.
If the evidence is insufficient, say so honestly.
Keep the email under 150 words.

Evidence:
{evidence_text}

Support agent request: {state['query']}

Email:"""
        retry_draft = call_llm(retry_prompt, max_tokens=400)

        # Re-verify the retry
        scores2 = model.predict([(evidence, retry_draft)])
        probs2 = np.exp(scores2) / np.exp(scores2).sum(axis=1, keepdims=True)
        label2 = labels[int(probs2[0].argmax())]

        return {
            "draft_email": retry_draft,
            "nli_verdict": label2,
            "nli_score": float(probs2[0].max()),
            "nli_retried": True,
            "messages": [
                AIMessage(content=f"NLI: {verdict} ({confidence:.2f}) — retrying"),
                AIMessage(content=f"NLI retry: {label2} ({float(probs2[0].max()):.2f})"),
            ],
        }

    return {
        "nli_verdict": verdict,
        "nli_score": confidence,
        "messages": [AIMessage(content=f"NLI: {verdict} ({confidence:.2f})")],
    }


# ---------------------------------------------------------------------------
# Risk assessment & HITL
# ---------------------------------------------------------------------------
HITL_THRESHOLD = 100.0


def risk_assessor(state):
    """Agent 4: evaluate draft for risk. High risk routes to human approval."""
    sql = state.get("sql_result", {})
    rows = sql.get("rows", [])
    refund_amount = float(rows[0].get("disputed_balance", 0) or 0) if rows else 0.0

    prompt = f"""Assess the risk of this refund resolution draft.

Draft:
{state.get('draft_email', 'No draft.')}

Refund amount: ${refund_amount:.2f}
Threshold: ${HITL_THRESHOLD:.2f}
Policy evidence was retrieved: {bool(state.get('policy_results'))}

Mark as HIGH risk if:
- Refund exceeds the threshold, or
- The draft makes a promise not clearly supported by the policy evidence, or
- The policy application is ambiguous.

Otherwise mark LOW.

Return only valid JSON:
{{"risk_level": "low", "refund_amount": {refund_amount}, "reason": "brief explanation"}}"""

    result = call_llm_json(prompt)
    if "error" in result:
        result = {"risk_level": "high", "refund_amount": refund_amount, "reason": "parse failure"}

    return {
        "risk": result,
        "messages": [AIMessage(content=f"Risk: {result.get('risk_level')} -- {result.get('reason')}")],
    }


from langgraph.types import interrupt


def human_approval_node(state):
    """HITL gate: pauses the graph and waits for human decision."""
    decision = interrupt(
        {
            "message": "High-risk refund needs human approval before sending.",
            "draft_email": state.get("draft_email", ""),
            "risk_assessment": state.get("risk", {}),
            "ticket_ref": state.get("ticket_ref"),
            "query": state.get("query"),
        }
    )
    approved = decision.get("approved", False) if isinstance(decision, dict) else False
    return {
        "approved": approved,
        "messages": [AIMessage(content=f"Human decision: {'APPROVED' if approved else 'DENIED'}")],
    }


def finalize_node(state):
    """Final node: record the outcome."""
    risk_level = (state.get("risk") or {}).get("risk_level", "low")
    approved = state.get("approved", False)

    if risk_level == "low" or approved:
        status = f"EMAIL_SENT: {state.get('draft_email', '')[:80]}..."
    else:
        status = "DENIED: Resolution held for review. Human declined approval."

    return {
        "final_status": status,
        "messages": [AIMessage(content=status[:120])],
    }


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver


def route_after_triage(state):
    """Decide which branches run in parallel based on triage."""
    branches = []
    if state.get("needs_sql", True):
        branches.append("sql_agent")
    if state.get("needs_policy", False):
        branches.append("policy_agent")
    return branches or ["synthesizer_agent"]


def route_after_risk(state):
    """Route to HITL for high risk, straight to finalize for low risk."""
    risk_level = (state.get("risk") or {}).get("risk_level", "low")
    return "human_approval_node" if risk_level == "high" else "finalize_node"


def build_graph(checkpointer=None):
    """Build and compile the LangGraph pipeline.

    Args:
        checkpointer: MemorySaver for testing, PostgresSaver for production.
                      If None, creates a new MemorySaver.
    """
    if checkpointer is None:
        checkpointer = MemorySaver()

    builder = StateGraph(AgentState)

    # Auth entry point
    builder.add_node("resolve_role", resolve_role_node)
    builder.add_node("reject_node", reject_node)

    # Pipeline nodes
    builder.add_node("triage_agent", triage_agent)
    builder.add_node("sql_agent", sql_agent)
    builder.add_node("policy_agent", policy_agent)
    builder.add_node("synthesizer_agent", synthesizer_agent)
    builder.add_node("nli_verifier", verify_draft_node)
    builder.add_node("risk_assessor", risk_assessor)
    builder.add_node("human_approval_node", human_approval_node)
    builder.add_node("finalize_node", finalize_node)

    # Edges
    builder.add_edge(START, "resolve_role")
    builder.add_conditional_edges(
        "resolve_role",
        route_after_auth,
        {"triage_agent": "triage_agent", "reject_node": "reject_node"},
    )
    builder.add_edge("reject_node", END)

    # Fan-out from triage
    builder.add_conditional_edges(
        "triage_agent",
        route_after_triage,
        {
            "sql_agent": "sql_agent",
            "policy_agent": "policy_agent",
            "synthesizer_agent": "synthesizer_agent",
        },
    )

    # Fan-in to synthesizer
    builder.add_edge("sql_agent", "synthesizer_agent")
    builder.add_edge("policy_agent", "synthesizer_agent")

    # Synthesis -> verify -> risk -> HITL or finalize
    builder.add_edge("synthesizer_agent", "nli_verifier")
    builder.add_edge("nli_verifier", "risk_assessor")
    builder.add_conditional_edges(
        "risk_assessor",
        route_after_risk,
        {"human_approval_node": "human_approval_node", "finalize_node": "finalize_node"},
    )
    builder.add_edge("human_approval_node", "finalize_node")
    builder.add_edge("finalize_node", END)

    return builder.compile(checkpointer=checkpointer)
