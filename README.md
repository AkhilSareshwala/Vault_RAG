# 🛡️ VaultRAG v4 — Autonomous Multi-Agent Support Engine

> **A production-grade AI support resolution system built with LangGraph, FastAPI, PostgreSQL Row-Level Security (RLS), and React + TypeScript.**

[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg)](https://www.typescriptlang.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2+-orange.svg)](https://github.com/langchain-ai/langgraph)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 💡 Why I Built This

Most AI customer support demos are just basic document chatbots — you ask a question, and it retrieves text. But real enterprise support teams need systems that can **safely take action**, enforce **data privacy rules**, verify facts to prevent hallucinations, and **pause for human approval** when money is on the line.

I built **VaultRAG v4** to solve those exact real-world engineering challenges:

- **Data Privacy via DB-Level RLS**: Customer support agents should only access tickets assigned to them. Rather than relying on fragile application-level checks, VaultRAG enforces security directly inside PostgreSQL using Row-Level Security (RLS) policies tied to verified JWT claims.
- **Hallucination Protection**: Before any generated email is approved, it runs through a `deberta-v3-small` Cross-Encoder NLI model to mathematically verify that every claim is backed by actual policy and database evidence.
- **Human-in-the-Loop (HITL) Gate**: Refunds under $100 are processed automatically. Any refund exceeding $100 (or flagged as policy-ambiguous) automatically pauses the pipeline using LangGraph state checkpoints and waits for a supervisor's explicit approval.

---

## 🚀 Key Features & Highlights

- **🔒 Real JWT Authentication & RLS**: Role-based access control (`support_agent`, `supervisor`, `admin`) baked directly into the database session context.
- **⚡ Parallel Multi-Agent Execution**: Triage agent dynamically routes tasks simultaneously across SQL data lookups and knowledge base retrievals.
- **🛡️ DeBERTa-v3 Entailment Verifier**: Natural Language Inference (NLI) verification step that checks draft resolution emails against retrieved facts.
- **🚦 Interrupt & Resume State Machine**: Full state persistence via LangGraph checkpointer allowing paused high-risk workflows to resume seamlessly upon human approval.
- **💻 Interactive React + TypeScript Dashboard**: Custom dark-themed UI featuring a live 8-node LangGraph topology visualizer, persona quick-login cards, interactive HITL review drawer, and thread audit history.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Vite, Lucide Icons, CSS Glassmorphism |
| **Backend API** | FastAPI, Uvicorn, Pydantic, PyJWT |
| **AI & Agent Workflow** | LangGraph, LangChain, Groq API (`qwen/qwen3.8-27b`) |
| **Verification & Database** | PostgreSQL Row-Level Security (RLS), DeBERTa-v3 Cross-Encoder (SentenceTransformers) |

---

## 🏗️ System Architecture

```
                       ┌─────────────────────────┐
                       │   React UI / API Client │
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │    resolve_role_node    │  JWT Auth & Claims
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │      triage_agent       │  Intent & Data Router
                       └────────────┬────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
       ┌─────────────┐                             ┌─────────────┐
       │  sql_agent  │                             │policy_agent │
       │(Postgres RLS)                             │ (Knowledge) │
       └──────┬──────┘                             └──────┬──────┘
              └─────────────────────┬─────────────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │    synthesizer_agent    │  Draft Email
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │      nli_verifier       │  DeBERTa-v3 Entailment
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │      risk_assessor      │  $100 Threshold Check
                       └────────────┬────────────┘
                          ┌─────────┴─────────┐
                          ▼                   ▼
                     Low Risk            High Risk (> $100)
                          │                   │
                          │          ┌────────▼────────┐
                          │          │ human_approval  │  HITL Pause Gate
                          │          └────────┬────────┘
                          │                   │ (Resume API)
                          └─────────┬─────────┘
                                    ▼
                       ┌─────────────────────────┐
                       │     finalize_node       │  Dispatch Resolution
                       └─────────────────────────┘
```

---

## 👥 Demo Personas & Permissions

| Persona | Username | Password | Role | PostgreSQL RLS Visibility |
| :--- | :--- | :--- | :--- | :--- |
| **Dave Agent** | `dave` | `agent123` | `support_agent` | Restricted strictly to assigned tickets (27 tickets) |
| **Erin Supervisor** | `erin` | `super123` | `supervisor` | Supervisory ticket visibility |
| **Frank Admin** | `frank` | `admin123` | `admin` | Unrestricted access to all customer tickets (50 tickets) |

---

## ⚡ Quick Start

### 1. Clone & Setup Backend

```bash
# Clone the repository
git clone https://github.com/AkhilSareshwala/Vault_RAG.git
cd Vault_RAG

# Add your Groq API key (free tier works)
echo "GROQ_API_KEY=gsk_your_key_here" > .env

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
Backend server runs at **`http://localhost:8000`**.

### 2. Setup & Launch Frontend

```bash
# In a new terminal, enter the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🎮 How to Test in the Browser

1. **Log in as a Persona**: Click **Select Persona** at top right and pick **Dave Agent** (`dave`).
2. **Auto-Resolve Query (< $100)**: Click the **Low-Value Refund ($45)** preset chip. Watch the 8-node visualizer run through Triage ➔ SQL ➔ Policy ➔ Synthesizer ➔ NLI Verifier ➔ Auto-Resolve (`EMAIL_SENT`).
3. **High-Risk HITL Gate (> $100)**: Click the **High-Value HITL ($150)** preset chip. The pipeline executes to the risk assessor and triggers the **Human-in-the-Loop Approval Drawer**. Click **Approve & Send** to resume the paused thread via `/resume`.
4. **PostgreSQL RLS Security Test**: As Dave, attempt to access Erin's ticket `T1004`. RLS limits visibility to 0 rows. Switch persona to Frank Admin to view full ticket details.

---

## 📝 License

Distributed under the MIT License. Built with passion to demonstrate production multi-agent systems with security and human oversight.
