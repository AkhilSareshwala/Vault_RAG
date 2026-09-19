import React from 'react';
import { Database, Cpu, Lock, FileCode2 } from 'lucide-react';

export const SystemOverview: React.FC = () => {
  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Cpu size={18} color="#38bdf8" />
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Architecture & Security Model</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {/* RLS Panel */}
        <div style={{
          padding: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.4rem' }}>
            <Database size={14} />
            <span>PostgreSQL Row-Level Security (RLS)</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Enforced in PostgreSQL database via session variables set from verified JWT claims (<code style={{ color: '#38bdf8' }}>SET LOCAL "app.current_role"</code>). Dave sees 27 assigned tickets; Frank sees all 50.
          </p>
        </div>

        {/* Multi-Agent LangGraph */}
        <div style={{
          padding: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#a855f7', marginBottom: '0.4rem' }}>
            <FileCode2 size={14} />
            <span>Parallel Agents & NLI Verification</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Triage fans out to SQL Agent (RLS) & Policy Agent. Draft emails are verified using <code style={{ color: '#c084fc' }}>deberta-v3-small</code> Cross-Encoder NLI entailment before risk evaluation.
          </p>
        </div>

        {/* HITL Gate */}
        <div style={{
          padding: '0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.4rem' }}>
            <Lock size={14} />
            <span>HITL Interrupt Gate ($100 Threshold)</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Queries exceeding $100 or with policy ambiguity trigger LangGraph <code style={{ color: '#fbbf24' }}>interrupt()</code>. Pipeline pauses in MemorySaver checkpoint state until explicit <code style={{ color: '#fbbf24' }}>/resume</code> decision.
          </p>
        </div>
      </div>
    </div>
  );
};
