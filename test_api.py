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
import psycopg2
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
    # Get a real high-value ticket from the database
    conn = psycopg2.connect(
        host="localhost", port=5434, dbname="vaultrag",
        user="postgres", password="postgres",
    )
    cur = conn.cursor()
    cur.execute(
        "SELECT id, customer_name, disputed_balance FROM customer_tickets "
        "WHERE support_agent_id = 'dave' AND disputed_balance > 100 "
        "ORDER BY disputed_balance DESC LIMIT 1"
    )
    high_value = cur.fetchone()
    conn.close()

    high_value_id = high_value[0] if high_value else None
    high_value_name = high_value[1] if high_value else "unknown"
    high_value_amount = float(high_value[2]) if high_value else 0

    t0 = time.time()
    try:
        r = client.post("/login", json={"username": "dave", "password": "agent123"})
        dave_token = r.json()["token"]
        headers = {"Authorization": f"Bearer {dave_token}"}
        r = client.post("/query", json={
            "query": f"{high_value_name} on ticket {high_value_id} has a ${high_value_amount:.0f} disputed balance. Please resolve.",
            "ticket_ref": high_value_id,
        }, headers=headers, timeout=120)
        data = r.json()
        hitl_ok = (
            r.status_code == 200
            and data.get("interrupted") is True
            and data.get("interrupt_payload") is not None
        )
        test(f"High-value ticket (${high_value_amount:.0f}) triggers HITL interrupt", hitl_ok,
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

    # ===================================================================
    # RLS tests — real Postgres, live API path
    # ===================================================================
    print(f"\n{BOLD}  -- RLS Enforcement (live Postgres) --{RESET}")

    # Get real ticket IDs from the database
    conn = psycopg2.connect(
        host="localhost", port=5434, dbname="vaultrag",
        user="postgres", password="postgres",
    )
    cur = conn.cursor()
    cur.execute("SELECT id, support_agent_id, customer_name FROM customer_tickets WHERE support_agent_id = 'dave' LIMIT 1")
    dave_ticket = cur.fetchone()
    cur.execute("SELECT id, support_agent_id, customer_name FROM customer_tickets WHERE support_agent_id = 'erin' LIMIT 1")
    erin_ticket = cur.fetchone()
    conn.close()

    dave_ticket_id = dave_ticket[0] if dave_ticket else None
    erin_ticket_id = erin_ticket[0] if erin_ticket else None
    erin_ticket_name = erin_ticket[2] if erin_ticket else "unknown"

    # --- RLS 1: Dave cannot see Erin's ticket ---
    t0 = time.time()
    try:
        r = client.post("/login", json={"username": "dave", "password": "agent123"})
        dave_token = r.json()["token"]
        headers = {"Authorization": f"Bearer {dave_token}"}
        r = client.post("/query", json={
            "query": f"Show me ticket {erin_ticket_id}",
            "ticket_ref": erin_ticket_id,
        }, headers=headers, timeout=120)
        data = r.json()
        # RLS blocks → 0 rows returned → refund_amount stays at 0
        rls_blocked = (
            r.status_code == 200
            and data.get("risk", {}).get("refund_amount", -1) == 0.0
        )
        test(f"RLS: Dave blocked from Erin's ticket ({erin_ticket_id[:8]}...)",
             rls_blocked,
             f"refund_amount: {data.get('risk', {}).get('refund_amount')}")
    except Exception as e:
        test(f"RLS: Dave blocked from Erin's ticket", False, str(e))

    # --- RLS 2: Dave CAN see his own ticket ---
    t0 = time.time()
    try:
        r = client.post("/login", json={"username": "dave", "password": "agent123"})
        dave_token = r.json()["token"]
        headers = {"Authorization": f"Bearer {dave_token}"}
        r = client.post("/query", json={
            "query": f"Show me ticket {dave_ticket_id}",
            "ticket_ref": dave_ticket_id,
        }, headers=headers, timeout=120)
        data = r.json()
        # Real data returned → refund_amount > 0 (from actual Postgres row)
        has_data = (
            r.status_code == 200
            and data.get("risk", {}).get("refund_amount", 0) > 0
        )
        test(f"RLS: Dave can see own ticket ({dave_ticket_id[:8]}...)",
             has_data,
             f"refund_amount: {data.get('risk', {}).get('refund_amount')}")
    except Exception as e:
        test(f"RLS: Dave can see own ticket", False, str(e))

    # --- RLS 3: Frank (admin) CAN see Erin's ticket ---
    t0 = time.time()
    try:
        r = client.post("/login", json={"username": "frank", "password": "admin123"})
        frank_token = r.json()["token"]
        headers = {"Authorization": f"Bearer {frank_token}"}
        r = client.post("/query", json={
            "query": f"Show me ticket {erin_ticket_id}",
            "ticket_ref": erin_ticket_id,
        }, headers=headers, timeout=120)
        data = r.json()
        # Admin sees all → refund_amount > 0
        admin_ok = (
            r.status_code == 200
            and data.get("risk", {}).get("refund_amount", 0) > 0
        )
        test(f"RLS: Frank (admin) sees Erin's ticket ({erin_ticket_id[:8]}...)",
             admin_ok,
             f"refund_amount: {data.get('risk', {}).get('refund_amount')}")
    except Exception as e:
        test(f"RLS: Frank (admin) sees Erin's ticket", False, str(e))

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
