"""
VaultRAG v4 — MCP Server Tests
================================
Tests the MCP server tools directly via Python imports.
Run with: python test_mcp.py
"""

import os
import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

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
    print(f"\n{BOLD}VaultRAG v4 — MCP Server Tests{RESET}\n")

    from app.mcp_server import login, query_pipeline, resume_pipeline, list_users

    # --- Login test ---
    result = json.loads(login("dave", "agent123"))
    test("Login returns token", "token" in result and result.get("role") == "support_agent")

    # --- Login failure ---
    result = json.loads(login("dave", "wrong"))
    test("Login wrong password fails", "error" in result)

    # --- List users ---
    result = json.loads(list_users())
    test("List users returns 3 users", len(result) == 3 and "dave" in result)

    # --- Query with valid token ---
    token = json.loads(login("dave", "agent123"))["token"]
    result = json.loads(query_pipeline(token, "test T1001", "T1001"))
    test("Query returns thread_id", "thread_id" in result and result.get("final_status") != "")

    # --- Query with invalid token ---
    result = json.loads(query_pipeline("bad-token", "test"))
    test("Query invalid token fails", "error" in result)

    # --- Resume non-existent thread ---
    result = json.loads(resume_pipeline(token, "fake-id", {"approved": True}))
    test("Resume fake thread fails", "error" in result)

    # --- Summary ---
    total = passed + failed
    print(f"\n{'='*50}")
    print(f"  {BOLD}MCP Tests: {passed}/{total} passed{RESET}")
    if failed == 0:
        print(f"  {GREEN}ALL PASSED{RESET}")
    print(f"{'='*50}\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
