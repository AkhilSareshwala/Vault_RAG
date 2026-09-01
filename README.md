# VaultRAG v4

> A multi-agent RAG system that actually resolves support tickets — not just answers questions about them.

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![LangGraph](https://img.shields.io/badge/langgraph-1.2+-orange.svg)](https://github.com/langchain-ai/langgraph)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## What This Does

Imagine a support agent types: *"John says he didn't receive his refund."*

Here's what happens behind the scenes, in about 2 seconds:

1. **Triage** — The system figures out this is a refund inquiry and pulls the ticket reference
2. **Parallel lookup** — Three things happen at once:
   - SQL agent queries John's order history (row-level security ensures it only sees what "dave" is allowed to see)
   - Policy agent finds the refund window rule from the knowledge base
   - Handbook agent navigates a 40-page compliance doc to check for edge cases
3. **Draft** — A synthesizer agent writes a resolution email using all three evidence sources
4. **Verify** — A trained classifier checks: does the email actually match what the evidence says? If not, retry once.
5. **Risk check** — Refund under $100? Auto-resolve. Over $100? Pause and wait for a human to approve.

That last step — the human pause — is the whole point. This isn't a chatbot. It's a pipeline that *does things* but knows when to stop.

---

## Why This Shape?

Most RAG demos stop at "embed → search → prompt." This one goes further because real systems need more:

| What | Why It's Here |
|------|---------------|
| **Postgres RLS** | Access control lives in the database, not in a prompt that can be jailbroken |
| **Parallel agents** | Three independent lookups run concurrently — this is the real reason to use a graph, not a chain |
| **Two retrieval methods** | Short policy docs get vector search. A 40-page handbook gets tree navigation. Different problems, different tools. |
| **NLI verifier** | A trained model checks the draft. Not another prompt — an actual classifier with measurable precision/recall. |
| **Human-in-the-loop** | High-risk actions pause. The pipeline resumes only after approval. That's the difference between "agent" and "automation." |

---

## How to Run It

**You'll need:** Python 3.12+, Docker, and a [Groq API key](https://console.groq.com) (free tier works).

```bash
# Clone and enter the project
git clone https://github.com/your-username/vaultrag-v4.git
cd vaultrag-v4

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
python notebooks/_run_nb.py notebooks/01_single_table_postgres_rls_and_faker.ipynb

# 2. Ingest policy docs into Qdrant, build the handbook tree
python notebooks/_run_nb.py notebooks/02_hybrid_silo_rag_and_vectorless_handbook.ipynb

# 3. Build the full LangGraph pipeline (triage → parallel lookup → synthesis → verify → HITL)
python notebooks/_run_nb.py notebooks/03_stateful_langgraph_pipeline_with_hitl.ipynb

# 4. Evaluate with RAGAS + run adversarial stress tests
python notebooks/_run_nb.py notebooks/04_ragas_evaluation_and_adversarial_testing.ipynb
```

**Verify everything works:**

```bash
python test_vaultrag.py
# → 36/36 tests passing, 100% score
```

---

## What's In Each Notebook

### 01 — Database + RLS
Creates the `customer_tickets` table, seeds it with 50 synthetic records using Faker, and configures Postgres Row-Level Security so each user role only sees what they're supposed to. Dave (support agent) sees 27 tickets. Frank (admin) sees all 50. No role set? Zero rows.

### 02 — Vector Search + Handbook
Ingests short policy documents into Qdrant with hybrid dense/sparse search. Builds a hierarchical tree for the compliance handbook — the LLM navigates it like a table of contents instead of chunking it into oblivion.

### 03 — The Pipeline
Assembles the full LangGraph state machine: triage agent, parallel fan-out (SQL + policy + handbook), synthesis, NLI verification, risk assessment, and the human-in-the-loop gate. This is where the architecture diagram comes to life.

### 04 — Evaluation + Adversarial Testing
Runs RAGAS metrics (faithfulness, context relevance, answer quality) and then tries to break the system — prompt injection, role escalation, data leakage, canary traps. Spoiler: it holds up.

---

## Architecture

```
"John says he didn't receive his refund"
              │
              ▼
     ┌────────────────┐
     │   Triage Agent  │  classify intent, extract refs
     └───────┬────────┘
             │
     ┌───────┼───────────────┐
     ▼       ▼               ▼
┌─────────┐ ┌────────────┐ ┌────────────┐
│ SQL     │ │ Policy     │ │ Handbook   │
│ Agent   │ │ Retrieval  │ │ Agent      │
│ (RLS)   │ │ (Vector)   │ │ (Tree)     │
└────┬────┘ └─────┬──────┘ └─────┬──────┘
     └────────────┼──────────────┘
                  ▼
     ┌────────────────────┐
     │  Synthesis Agent   │  draft resolution email
     └────────┬───────────┘
              ▼
     ┌────────────────────┐
     │   NLI Verifier     │  check draft vs evidence
     │   (trained model)  │  retry once if unsupported
     └────────┬───────────┘
              ▼
     ┌────────────────────┐
     │  Risk Assessment   │  refund amount → threshold
     └────────┬───────────┘
           ┌──┴──┐
           ▼     ▼
      Auto-   HITL Gate
      resolve (pause for human)
```

---

## Design Choices Worth Knowing

**Why RLS instead of app-layer filtering?**
Because app-layer checks can be bypassed, forgotten, or inconsistent across services. RLS lives in Postgres — every query, every interface, same rules.

**Why two retrieval methods?**
Short policy docs are independent snippets. Vector search is perfect — fast, cheap, no structure to lose. The compliance handbook is 40 pages with cross-references. Chunking it destroys meaning. Tree navigation preserves it.

**Why a trained verifier instead of another prompt?**
Prompts are non-deterministic. A fine-tuned NLI classifier gives you measurable precision/recall. You can actually answer "how reliable is this?" with numbers.

**Why human-in-the-loop?**
Because a system that drafts emails is useful. A system that sends them without approval is liability. The `interrupt()` + checkpointer pattern lets the pipeline pause mid-execution and resume exactly where it left off after approval.

---

## Test Results

```
✓ Infrastructure   3/3    PostgreSQL, Qdrant, API key
✓ Database         7/7    RLS policies, isolation, seed data
✓ Vector           5/5    Embeddings, search, empty handling
✓ HITL             3/3    Interrupt, resume, checkpointing
✓ LLM              5/5    Factual QA, JSON, classification
✓ Pipeline         5/5    Triage, risk, email drafting
✓ Guardrails       5/5    SQL injection, prompt injection, escalation
✓ RAG              3/3    Faithfulness, context relevance

36/36 — 100% score
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | API key for LLM inference | `gsk_...` |
| `DATABASE_URL` | Postgres connection string | `postgresql://vaultrag:vaultrag_secret@localhost:5434/vaultrag_db` |

---

## License

MIT — do whatever you want with it.

---

<p align="center">
  <sub>Built to prove that multi-agent RAG can be more than a demo.</sub>
</p>
