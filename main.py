"""
VaultRAG v4 — FastAPI Service
==============================
Provides /login, /query, and /resume endpoints.
Reuses the shared graph from app/graph_nodes.py.
"""

import os
import uuid
from typing import Optional

from dotenv import load_dotenv
import pathlib

project_root = pathlib.Path(__file__).resolve().parent
load_dotenv(project_root / ".env")

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import issue_token, verify_token
from app.graph_nodes import build_graph, AgentState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="VaultRAG v4 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

checkpointer = MemorySaver()
graph = build_graph(checkpointer=checkpointer)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    user_id: str


class QueryRequest(BaseModel):
    query: str
    ticket_ref: Optional[str] = None


class QueryResponse(BaseModel):
    thread_id: str
    final_status: str
    draft_email: str
    risk: dict
    interrupted: bool
    interrupt_payload: Optional[dict] = None


class ResumeRequest(BaseModel):
    thread_id: str
    decision: dict


class ResumeResponse(BaseModel):
    thread_id: str
    final_status: str
    draft_email: str
    risk: dict


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
def get_current_user(authorization: str = Header(...)) -> tuple:
    """Extract and verify JWT from Authorization header. Returns (claims, token)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    claims = verify_token(token)
    if claims is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return claims, token


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """Authenticate and return a JWT."""
    token = issue_token(req.username, req.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    claims = verify_token(token)
    return LoginResponse(token=token, role=claims["role"], user_id=claims["user_id"])


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest, auth: tuple = Depends(get_current_user)):
    """Run the pipeline with a new thread."""
    user, token = auth
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state: AgentState = {
        "messages": [],
        "query": req.query,
        "token": token,
        "role": "",
        "user_id": "",
        "token_valid": False,
        "needs_sql": False,
        "needs_policy": False,
        "ticket_ref": req.ticket_ref,
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
    if interrupted:
        interrupt_payload = snapshot.tasks[-1].interrupts[0].value if snapshot.tasks else None

    return QueryResponse(
        thread_id=thread_id,
        final_status=result.get("final_status", ""),
        draft_email=result.get("draft_email", ""),
        risk=result.get("risk", {}),
        interrupted=interrupted,
        interrupt_payload=interrupt_payload,
    )


@app.post("/resume", response_model=ResumeResponse)
def resume(req: ResumeRequest, auth: tuple = Depends(get_current_user)):
    """Resume a paused pipeline with a human decision."""
    user, token = auth
    config = {"configurable": {"thread_id": req.thread_id}}

    # Verify thread exists
    snapshot = graph.get_state(config)
    if not snapshot or not snapshot.next:
        raise HTTPException(status_code=404, detail="Thread not found or not paused")

    result = graph.invoke(Command(resume=req.decision), config=config)

    return ResumeResponse(
        thread_id=req.thread_id,
        final_status=result.get("final_status", ""),
        draft_email=result.get("draft_email", ""),
        risk=result.get("risk", {}),
    )


@app.get("/health")
def health():
    return {"status": "ok"}
