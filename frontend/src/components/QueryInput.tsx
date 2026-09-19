import React, { useState } from 'react';
import { ScenarioPreset } from '../types';
import { Send, Zap, Ticket, Sparkles } from 'lucide-react';

const PRESETS: ScenarioPreset[] = [
  {
    id: 'preset-1',
    title: 'Low-Value Refund ($45)',
    query: 'Alice Smith on ticket T1001 says her $45 refund has not arrived.',
    ticket_ref: 'T1001',
    tag: 'auto-resolve',
    tagLabel: 'Auto-Resolve ($45)',
    description: 'Under $100 threshold. Pipeline auto-resolves & drafts email instantly.',
  },
  {
    id: 'preset-2',
    title: 'High-Value HITL ($150)',
    query: 'Customer request for ticket T1002 with $150 disputed refund balance.',
    ticket_ref: 'T1002',
    tag: 'hitl-interrupt',
    tagLabel: 'HITL Gate (> $100)',
    description: 'Exceeds $100 threshold. Pauses pipeline for human approval.',
  },
  {
    id: 'preset-3',
    title: 'Postgres RLS Security Test',
    query: 'Inspect ticket T1003 details for refund verification.',
    ticket_ref: 'T1003',
    tag: 'rls-blocked',
    tagLabel: 'RLS Context Check',
    description: 'Tests PostgreSQL RLS context variables against JWT claims.',
  },
];

interface QueryInputProps {
  onSubmit: (query: string, ticketRef: string) => void;
  loading: boolean;
}

export const QueryInput: React.FC<QueryInputProps> = ({ onSubmit, loading }) => {
  const [queryText, setQueryText] = useState('');
  const [ticketRef, setTicketRef] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || loading) return;
    onSubmit(queryText, ticketRef);
  };

  const handleSelectPreset = (preset: ScenarioPreset) => {
    setQueryText(preset.query);
    setTicketRef(preset.ticket_ref);
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      {/* Scenario Preset Chips */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Zap size={16} color="#38bdf8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Quick Scenario Presets
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {PRESETS.map((preset) => {
            let badgeBg = 'rgba(6, 182, 212, 0.15)';
            let badgeColor = '#38bdf8';
            if (preset.tag === 'hitl-interrupt') {
              badgeBg = 'rgba(245, 158, 11, 0.15)';
              badgeColor = '#fbbf24';
            } else if (preset.tag === 'rls-blocked') {
              badgeBg = 'rgba(168, 85, 247, 0.15)';
              badgeColor = '#c084fc';
            }

            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                disabled={loading}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{preset.title}</span>
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    background: badgeBg,
                    color: badgeColor,
                    fontWeight: 600
                  }}>
                    {preset.tagLabel}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              rows={2}
              placeholder="Type your support resolution request or customer query (e.g. John refund inquiry for ticket T1001)..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.9rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
              <Ticket size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Ticket Ref"
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  fontFamily: 'JetBrains Mono'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!queryText.trim() || loading}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: loading
                  ? 'rgba(56, 189, 248, 0.2)'
                  : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                color: loading ? 'var(--text-muted)' : '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                cursor: (!queryText.trim() || loading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: loading ? 'none' : 'var(--shadow-glow-cyan)'
              }}
            >
              {loading ? (
                <>
                  <Sparkles size={16} className="animate-pulse-glow" />
                  <span>Invoking...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Execute Graph</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
