"""
VaultRAG v4 — FastAPI Integration Tests
========================================
Tests /login, /query, /resume endpoints.
Run with: python test_api.py
"""

import os
import sys
import time
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

import httpx

BASE_URL = "http://localhost:8000"
GREEN = "\033[92m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

passed = 0
failed = 0


def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [{GREEN}PASS{RESET}] {name}")
    else:
        failed += 1
        print(f"  [{RED}FAIL{RESET}] {name}  {detail}")


def main():
    global passed, failed
    print(f"\n{BOLD}VaultRAG v4 — API Integration Tests{RESET}\n")

    client = httpx.Client(base_url=BASE_URL, timeout=60.0)

    # --- Health check ---
    t0 = time.time()
    try:
        r = client.get("/health")
        test("Health endpoint", r.status_code == 200 and r.json().get("status") == "ok")
    except Exception as e:
        test("Health endpoint", False, str(e))

    # --- Login with valid credentials ---
    t0 = time.time()
    try:
        r = client.post("/login", json={"username": "dave", "password": "agent123"})
        login_ok = r.status_code == 200 and "token" in r.json()
        token = r.json().get("token", "") if login_ok else ""
        test("Login valid credentials", login_ok, f"Status: {r.status_code}")
    except Exception as e:
        test("Login valid credentials", False, str(e))
        token = ""

    # --- Login with invalid credentials ---
    t0 = time.time()
    try:
        r = client.post("/login", json={"username": "dave", "password": "wrong"})
        test("Login invalid credentials rejected", r.status_code == 401)
    except Exception as e:
        test("Login invalid credentials rejected", False, str(e))

    # --- Query without token ---
    t0 = time.time()
    try:
        r = client.post("/query", json={"query": "test"})
        test("Query without token rejected", r.status_code in (401, 422))
    except Exception as e:
        test("Query without token rejected", False, str(e))

    # --- Query with valid token (low-value ticket) ---
    t0 = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post("/query", json={
            "query": "Alice Smith on ticket T1001 says her $45 refund has not arrived.",
            "ticket_ref": "T1001",
        }, headers=headers)
        data = r.json()
        query_ok = (
            r.status_code == 200
            and "thread_id" in data
            and data.get("final_status", "") != ""
        )
        test("Query with valid token", query_ok,
             f"Status: {r.status_code}, thread_id: {data.get('thread_id', 'N/A')[:8]}...")
        thread_id = data.get("thread_id", "")
    except Exception as e:
        test("Query with valid token", False, str(e))
        thread_id = ""

    # --- Query with invalid token ---
    t0 = time.time()
    try:
        headers = {"Authorization": "Bearer invalid-token-xyz"}
        r = client.post("/query", json={"query": "test"}, headers=headers)
        test("Query with invalid token rejected", r.status_code == 401)
    except Exception as e:
        test("Query with invalid token rejected", False, str(e))

    # --- Resume without token ---
    t0 = time.time()
    try:
        r = client.post("/resume", json={"thread_id": "fake", "decision": {"approved": True}})
        test("Resume without token rejected", r.status_code in (401, 422))
    except Exception as e:
        test("Resume without token rejected", False, str(e))

    # --- Resume with non-existent thread ---
    t0 = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post("/resume", json={
            "thread_id": "non-existent-thread-id",
            "decision": {"approved": True},
        }, headers=headers)
        test("Resume non-existent thread returns 404", r.status_code == 404)
    except Exception as e:
        test("Resume non-existent thread returns 404", False, str(e))

    # --- High-value ticket query (should interrupt) ---
    t0 = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post("/query", json={
            "query": "Carol White on ticket T1010 has a $275 disputed balance on damaged goods.",
            "ticket_ref": "T1010",
        }, headers=headers)
        data = r.json()
        hitl_ok = (
            r.status_code == 200
            and data.get("interrupted") is True
            and data.get("interrupt_payload") is not None
        )
        test("High-value ticket triggers HITL interrupt", hitl_ok,
             f"interrupted: {data.get('interrupted')}, payload: {bool(data.get('interrupt_payload'))}")
        hitl_thread = data.get("thread_id", "")
    except Exception as e:
        test("High-value ticket triggers HITL interrupt", False, str(e))
        hitl_thread = ""

    # --- Resume high-value ticket with approval ---
    t0 = time.time()
    try:
        headers = {"Authorization": f"Bearer {token}"}
        r = client.post("/resume", json={
            "thread_id": hitl_thread,
            "decision": {"approved": True},
        }, headers=headers)
        data = r.json()
        resume_ok = (
            r.status_code == 200
            and "EMAIL_SENT" in data.get("final_status", "")
        )
        test("Resume with approval sends email", resume_ok,
             f"final_status: {data.get('final_status', '')[:60]}")
    except Exception as e:
        test("Resume with approval sends email", False, str(e))

    # --- Summary ---
    total = passed + failed
    print(f"\n{'='*50}")
    print(f"  {BOLD}API Tests: {passed}/{total} passed{RESET}")
    if failed == 0:
        print(f"  {GREEN}ALL PASSED{RESET}")
    print(f"{'='*50}\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
