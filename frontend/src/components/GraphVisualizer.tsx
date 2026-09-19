import React from 'react';
import { QueryResponse, ResumeResponse } from '../types';
import { ShieldCheck, Compass, Database, FileText, Sparkles, CheckCircle2, AlertTriangle, UserCheck, ArrowRight } from 'lucide-react';

interface GraphVisualizerProps {
  lastResult: QueryResponse | ResumeResponse | null;
  loading: boolean;
  activePersonaRole: string | null;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ lastResult, loading, activePersonaRole }) => {
  const isInterrupted = lastResult && 'interrupted' in lastResult && lastResult.interrupted;
  const isResumed = lastResult && 'final_status' in lastResult && lastResult.final_status.startsWith('EMAIL_SENT');
  const isDenied = lastResult && 'final_status' in lastResult && lastResult.final_status.startsWith('DENIED');
  const isRejected = lastResult && 'final_status' in lastResult && lastResult.final_status.startsWith('REJECTED');

  const nodes = [
    {
      id: 'resolve_role',
      label: 'resolve_role',
      title: '1. JWT Auth Node',
      desc: `Claims: ${activePersonaRole || 'Anonymous'}`,
      icon: ShieldCheck,
      color: '#38bdf8',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'triage_agent',
      label: 'triage_agent',
      title: '2. Triage Node',
      desc: 'Classifies intent & data needs',
      icon: Compass,
      color: '#38bdf8',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'sql_agent',
      label: 'sql_agent',
      title: '3a. SQL Agent (RLS)',
      desc: 'PostgreSQL ticket lookup',
      icon: Database,
      color: '#06b6d4',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'policy_agent',
      label: 'policy_agent',
      title: '3b. Policy Agent',
      desc: 'Vector/keyword search',
      icon: FileText,
      color: '#06b6d4',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'synthesizer_agent',
      label: 'synthesizer',
      title: '4. Synthesizer',
      desc: 'Drafts resolution email',
      icon: Sparkles,
      color: '#a855f7',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'nli_verifier',
      label: 'nli_verifier',
      title: '5. NLI Verifier',
      desc: 'DeBERTa-v3 entailment check',
      icon: CheckCircle2,
      color: '#10b981',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'risk_assessor',
      label: 'risk_assessor',
      title: '6. Risk Assessor',
      desc: '$100 threshold check',
      icon: AlertTriangle,
      color: lastResult?.risk?.risk_level === 'high' ? '#f59e0b' : '#10b981',
      status: loading ? 'running' : lastResult ? 'success' : 'idle',
    },
    {
      id: 'gate_node',
      label: isInterrupted ? 'human_approval' : 'finalize_node',
      title: isInterrupted ? '7. HITL Gate (Paused)' : '7. Finalize Node',
      desc: isInterrupted
        ? 'Awaiting Approval'
        : isDenied
        ? 'Denied & Held'
        : isRejected
        ? 'Auth Rejected'
        : isResumed || lastResult
        ? 'Email Dispatched'
        : 'Outcome Ready',
      icon: isInterrupted ? UserCheck : CheckCircle2,
      color: isInterrupted ? '#f59e0b' : isDenied ? '#ef4444' : '#10b981',
      status: loading ? 'running' : isInterrupted ? 'paused' : lastResult ? 'success' : 'idle',
    },
  ];

  return (
    <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>LangGraph Pipeline Topology</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
          State Graph: 8 Nodes
        </span>
      </div>

      {/* Grid Flow */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem',
        alignItems: 'center'
      }}>
        {nodes.map((n, idx) => {
          const IconComp = n.icon;
          const isActive = loading || (n.status === 'success') || (n.status === 'paused');
          const isPaused = n.status === 'paused';

          return (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: isPaused
                    ? 'rgba(245, 158, 11, 0.12)'
                    : isActive
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(255, 255, 255, 0.01)',
                  border: isPaused
                    ? '1px solid rgba(245, 158, 11, 0.5)'
                    : isActive
                    ? `1px solid ${n.color}`
                    : '1px solid var(--border-subtle)',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.35rem'
                }}>
                  <IconComp size={18} color={n.color} className={loading ? 'animate-pulse-glow' : ''} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {n.desc}
                </div>

                {isPaused && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    boxShadow: '0 0 8px #f59e0b'
                  }} />
                )}
              </div>

              {idx < nodes.length - 1 && (
                <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.4 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
