"""
VaultRAG v4 — MCP Server
=========================
Exposes the LangGraph pipeline as an MCP tool.
Reuses the same compiled graph as main.py via app.graph_nodes.build_graph().
"""

import os
import uuid
import json
import pathlib
from typing import Optional

from dotenv import load_dotenv

project_root = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

from app.auth import issue_token, verify_token
from app.graph_nodes import build_graph, AgentState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from mcp.server.mcpserver import MCPServer

# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------
mcp = MCPServer("VaultRAG v4", instructions="Customer support refund resolution agent with JWT auth and HITL")

# Shared graph instance
checkpointer = MemorySaver()
graph = build_graph(checkpointer=checkpointer)


@mcp.tool()
def login(username: str, password: str) -> str:
    """Authenticate and return a JWT token.

    Args:
        username: The username (dave, erin, or frank)
        password: The password (agent123, super123, or admin123)
    """
    token = issue_token(username, password)
    if token is None:
        return json.dumps({"error": "Invalid credentials"})
    claims = verify_token(token)
    return json.dumps({"token": token, "role": claims["role"], "user_id": claims["user_id"]})


@mcp.tool()
def query_pipeline(token: str, query: str, ticket_ref: Optional[str] = None) -> str:
    """Run the refund resolution pipeline with a query.

    Args:
        token: A valid JWT token from login()
        query: The support agent's query about a refund or return
        ticket_ref: Optional ticket reference (e.g. T1001)
    """
    claims = verify_token(token)
    if claims is None:
        return json.dumps({"error": "Invalid or expired token"})

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state: AgentState = {
        "messages": [],
        "query": query,
        "token": token,
        "role": claims["role"],
        "user_id": claims["user_id"],
        "token_valid": True,
        "needs_sql": False,
        "needs_policy": False,
        "ticket_ref": ticket_ref,
        "sql_result": {},
        "policy_results": [],
        "draft_email": "",
        "risk": {},
        "approved": False,
        "final_status": "",
        "thread_id": thread_id,
        "nli_verdict": "",
        "nli_score": 0.0,
        "nli_retried": False,
    }

    result = graph.invoke(initial_state, config=config)
    snapshot = graph.get_state(config)
    interrupted = bool(snapshot.next)

    interrupt_payload = None
    if interrupted and snapshot.tasks:
        interrupts = snapshot.tasks[-1].interrupts
        if interrupts:
            interrupt_payload = interrupts[0].value

    return json.dumps({
        "thread_id": thread_id,
        "final_status": result.get("final_status", ""),
        "draft_email": result.get("draft_email", ""),
        "risk": result.get("risk", {}),
        "interrupted": interrupted,
        "interrupt_payload": interrupt_payload,
    })


@mcp.tool()
def resume_pipeline(token: str, thread_id: str, decision: dict) -> str:
    """Resume a paused pipeline with a human decision.

    Args:
        token: A valid JWT token from login()
        thread_id: The thread_id from a query_pipeline response that was interrupted
        decision: The human decision, e.g. {"approved": true} or {"approved": false}
    """
    claims = verify_token(token)
    if claims is None:
        return json.dumps({"error": "Invalid or expired token"})

    config = {"configurable": {"thread_id": thread_id}}
    snapshot = graph.get_state(config)
    if not snapshot or not snapshot.next:
        return json.dumps({"error": "Thread not found or not paused"})

    result = graph.invoke(Command(resume=decision), config=config)

    return json.dumps({
        "thread_id": thread_id,
        "final_status": result.get("final_status", ""),
        "draft_email": result.get("draft_email", ""),
        "risk": result.get("risk", {}),
    })


@mcp.tool()
def list_users() -> str:
    """List all available users and their roles."""
    from app.auth import USERS
    users = {k: {"role": v["role"], "user_id": v["user_id"]} for k, v in USERS.items()}
    return json.dumps(users)


if __name__ == "__main__":
    import asyncio
    asyncio.run(mcp.run_stdio_async())
