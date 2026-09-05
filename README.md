# VaultRAG v4

> A multi-agent RAG system that actually resolves support tickets — not just answers questions about them.

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![LangGraph](https://img.shields.io/badge/langgraph-1.2+-orange.svg)](https://github.com/langchain-ai/langgraph)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## What This Does

Imagine a support agent types: *"John says he didn't receive his refund."*

Here's what happens behind the scenes, in about 2 seconds:

1. **Authenticate** — The system verifies who you are using a real JWT token. Dave (support agent) can only see his own tickets. Frank (admin) sees everything.
2. **Triage** — The system figures out this is a refund inquiry and pulls the ticket reference
3. **Parallel lookup** — Three things happen at once:
   - SQL agent queries John's order history (row-level security ensures it only sees what "dave" is allowed to see)
   - Policy agent finds the refund window rule from the knowledge base
   - Handbook agent navigates a 40-page compliance doc to check for edge cases
4. **Draft** — A synthesizer agent writes a resolution email using all three evidence sources
5. **Risk check** — Refund under $100? Auto-resolve. Over $100? Pause and wait for a human to approve.

That last step — the human pause — is the whole point. This isn't a chatbot. It's a pipeline that *does things* but knows when to stop.

---

## What's New in This Version

### 1. Real JWT Authentication

No more hardcoded roles. Every request goes through proper token-based auth:

- **`/login`** — Exchange username/password for a signed JWT
- **`/query`** — Run the pipeline with a verified identity
- **`/resume`** — Resume a paused pipeline after human approval

Three users with different access levels:

| Username | Password | Role | What They See |
|----------|----------|------|---------------|
| `dave` | `agent123` | support_agent | Only his own tickets |
| `erin` | `super123` | supervisor | Supervisory access |
| `frank` | `admin123` | admin | All tickets |

The graph's entry point now starts with `resolve_role_node` — it verifies the JWT before any agent runs. Invalid tokens get rejected immediately.

### 2. FastAPI Deployment

The pipeline is now a production-ready API:

```bash
# Start with Docker
docker-compose up -d

# Or run directly
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Endpoints:**
- `POST /login` — Get a JWT token
- `POST /query` — Run the refund resolution pipeline
- `POST /resume` — Resume after human approval
- `GET /health` — Check if the API is running

### 3. MCP Server

Expose the pipeline as MCP tools for AI assistants:

```bash
# Run the MCP server
python -m app.mcp_server
```

**Available tools:**
- `login` — Authenticate and get a token
- `query_pipeline` — Run the pipeline with a query
- `resume_pipeline` — Resume after human approval
- `list_users` — See available users and roles

---

## How It All Fits Together

```
                    ┌─────────────┐
                    │   Client    │
                    │  (API/MCP)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   /login    │  JWT auth
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   /query    │  pipeline request
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │    resolve_role_node    │  verify JWT
              │    (entry point)        │  extract role/user_id
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │   Triage    │  classify intent
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   SQL    │    │  Policy  │    │ Handbook │
    │  Agent   │    │  Agent   │    │  Agent   │
    │  (RLS)   │    │ (Vector) │    │  (Tree)  │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         └───────────────┼───────────────┘
                         ▼
                ┌────────────────┐
                │  Synthesizer   │  draft email
                └───────┬────────┘
                        ▼
                ┌────────────────┐
                │ Risk Assessor  │  $100 threshold
                └───────┬────────┘
                   ┌────┴────┐
                   ▼         ▼
              Auto-      HITL Gate
              resolve    (pause)
```

---

## How to Run It

**You'll need:** Python 3.12+, Docker, and a [Groq API key](https://console.groq.com) (free tier works).

```bash
# Clone and enter the project
git clone https://github.com/AkhilSareshwala/Vault_RAG.git
cd Vault_RAG

# Add your API key
echo "GROQ_API_KEY=gsk_your_key_here" > .env

# Start the database and vector store
docker-compose up -d

# Install Python dependencies
pip install -r requirements.txt
```

**Run the notebooks in order** — each one builds on the last:

```bash
# 1. Set up the database, seed 50 tickets, configure row-level security
python notebooks/01_single_table_postgres_rls_and_faker.ipynb

# 2. Ingest policy docs into Qdrant, build the handbook tree
python notebooks/02_hybrid_silo_rag_and_vectorless_handbook.ipynb

# 3. Build the full LangGraph pipeline
python notebooks/03_stateful_langgraph_pipeline_with_hitl.ipynb

# 4. Evaluate with RAGAS + run adversarial stress tests
python notebooks/04_ragas_evaluation_and_adversarial_testing.ipynb
```

**Verify everything works:**

```bash
# Full test suite with real LLM calls (41 tests)
python test_vaultrag.py

# API integration tests (10 tests)
python test_api.py

# MCP server tests (6 tests)
python test_mcp.py
```

---

## What's In Each Notebook

### 01 — Database + RLS
Creates the `customer_tickets` table, seeds it with 50 synthetic records using Faker, and configures Postgres Row-Level Security so each user role only sees what they're supposed to. Dave (support agent) sees 27 tickets. Frank (admin) sees all 50. No role set? Zero rows.

### 02 — Vector Search + Handbook
Ingests short policy documents into Qdrant with hybrid dense/sparse search. Builds a hierarchical tree for the compliance handbook — the LLM navigates it like a table of contents instead of chunking it into oblivion.

### 03 — The Pipeline
Assembles the full LangGraph state machine with JWT auth as the entry point. Four agents run in parallel where possible, with a human-in-the-loop gate for high-risk decisions. The graph now starts with `resolve_role_node` — no agent runs without a verified identity.

### 04 — Evaluation + Adversarial Testing
Runs RAGAS metrics (faithfulness, context relevance, answer quality) and then tries to break the system — prompt injection, role escalation, data leakage, canary traps. Spoiler: it holds up.

---

## Project Structure

```
Vault_RAG/
├── app/
│   ├── __init__.py
│   ├── auth.py              # JWT issue/verify (PyJWT HS256)
│   ├── graph_nodes.py       # All agent nodes + build_graph()
│   └── mcp_server.py        # MCP server tools
├── notebooks/
│   ├── 01_single_table_postgres_rls_and_faker.ipynb
│   ├── 02_hybrid_silo_rag_and_vectorless_handbook.ipynb
│   ├── 03_stateful_langgraph_pipeline_with_hitl.ipynb
│   └── 04_ragas_evaluation_and_adversarial_testing.ipynb
├── main.py                  # FastAPI server
├── test_vaultrag.py         # 41 system tests
├── test_api.py              # 10 API integration tests
├── test_mcp.py              # 6 MCP server tests
├── docker-compose.yml       # Postgres + Qdrant + API
├── Dockerfile.api           # API container
├── requirements.txt         # Pinned dependencies
├── .env                     # API keys (not in git)
└── .gitignore
```

---

## Test Results

```
✓ Infrastructure   3/3    PostgreSQL, Qdrant, API key
✓ Database         7/7    RLS policies, isolation, seed data
✓ Vector           5/5    Embeddings, search, empty handling
✓ JWT Auth         5/5    Token issue/verify, graph auth flow
✓ HITL             3/3    Interrupt, resume, checkpointing
✓ LLM              5/5    Factual QA, JSON, classification
✓ Pipeline         5/5    Triage, risk, email drafting
✓ Guardrails       5/5    SQL injection, prompt injection, escalation
✓ RAG              3/3    Faithfulness, context relevance

41/41 — 100% score (with real LLM calls)
```

**API Tests:**
```
✓ Health endpoint
✓ Login valid/invalid credentials
✓ Query with valid/invalid token
✓ Resume valid/invalid thread
✓ HITL interrupt + resume
✓ Authorization enforcement

10/10 — ALL PASSED
```

**MCP Tests:**
```
✓ Login returns token
✓ Login wrong password fails
✓ List users returns 3 users
✓ Query returns thread_id
✓ Query invalid token fails
✓ Resume fake thread fails

6/6 — ALL PASSED
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | API key for LLM inference (Groq) | Yes |
| `JWT_SECRET` | Secret key for signing JWTs | No (defaults to dev key) |
| `DATABASE_URL` | Postgres connection string | Set by docker-compose |

---

## Key Design Decisions

**Why RLS instead of app-layer filtering?**
Because app-layer checks can be bypassed, forgotten, or inconsistent across services. RLS lives in Postgres — every query, every interface, same rules.

**Why JWT auth at the graph level?**
The `resolve_role_node` is the first node in the pipeline. No agent runs without a verified identity. The token is verified once at the entry point, and the extracted role/user_id flow through the entire pipeline.

**Why two retrieval methods?**
Short policy docs are independent snippets. Vector search is perfect — fast, cheap, no structure to lose. The compliance handbook is 40 pages with cross-references. Chunking it destroys meaning. Tree navigation preserves it.

**Why human-in-the-loop?**
Because a system that drafts emails is useful. A system that sends them without approval is liability. The `interrupt()` + checkpointer pattern lets the pipeline pause mid-execution and resume exactly where it left off after approval.

---

## License

MIT — do whatever you want with it.

---

<p align="center">
  <sub>Built to prove that multi-agent RAG can be more than a demo.</sub>
</p>
