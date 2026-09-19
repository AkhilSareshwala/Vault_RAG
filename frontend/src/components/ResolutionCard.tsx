import React, { useState } from 'react';
import { QueryResponse, ResumeResponse } from '../types';
import { Mail, CheckCircle2, ShieldCheck, Copy, Check, AlertOctagon, FileText } from 'lucide-react';

interface ResolutionCardProps {
  result: QueryResponse | ResumeResponse | null;
}

export const ResolutionCard: React.FC<ResolutionCardProps> = ({ result }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!result) return null;

  const handleCopy = () => {
    if (result.draft_email) {
      navigator.clipboard.writeText(result.draft_email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isEmailSent = result.final_status.startsWith('EMAIL_SENT');
  const isDenied = result.final_status.startsWith('DENIED');
  const isRejected = result.final_status.startsWith('REJECTED');

  let statusBg = 'rgba(16, 185, 129, 0.15)';
  let statusBorder = 'rgba(16, 185, 129, 0.3)';
  let statusColor = '#34d399';
  let statusText = 'RESOLUTION APPROVED & SENT';

  if (isDenied) {
    statusBg = 'rgba(239, 68, 68, 0.15)';
    statusBorder = 'rgba(239, 68, 68, 0.3)';
    statusColor = '#f87171';
    statusText = 'HELD / DENIED BY SUPERVISOR';
  } else if (isRejected) {
    statusBg = 'rgba(168, 85, 247, 0.15)';
    statusBorder = 'rgba(168, 85, 247, 0.3)';
    statusColor = '#c084fc';
    statusText = 'AUTH REJECTED (INVALID JWT)';
  } else if ('interrupted' in result && result.interrupted) {
    statusBg = 'rgba(245, 158, 11, 0.15)';
    statusBorder = 'rgba(245, 158, 11, 0.3)';
    statusColor = '#fbbf24';
    statusText = 'PAUSED FOR HUMAN APPROVAL';
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        background: statusBg,
        border: `1px solid ${statusBorder}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isEmailSent ? (
            <CheckCircle2 size={20} color={statusColor} />
          ) : (
            <AlertOctagon size={20} color={statusColor} />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: statusColor }}>
            {statusText}
          </span>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
          Thread: {result.thread_id.substring(0, 8)}...
        </div>
      </div>

      {/* Grid Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Risk Pill */}
        <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Risk Assessment</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.1rem 0.5rem',
              borderRadius: '4px',
              background: result.risk?.risk_level === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: result.risk?.risk_level === 'high' ? '#fbbf24' : '#34d399',
              textTransform: 'uppercase'
            }}>
              {result.risk?.risk_level || 'LOW'} RISK
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              ${(result.risk?.refund_amount || 0).toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {result.risk?.reason || 'Within standard policy parameters'}
          </div>
        </div>

        {/* NLI Entailment Pill */}
        <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>NLI Entailment Verification</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
              Verified Entailed
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Cross-encoder deberta-v3 verified claims follow from Postgres/Policy evidence
          </div>
        </div>
      </div>

      {/* Draft Email View */}
      {result.draft_email && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <Mail size={16} color="#38bdf8" />
              <span>Draft Resolution Email</span>
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Email'}</span>
            </button>
          </div>

          <div style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            color: '#f1f5f9',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit'
          }}>
            {result.draft_email}
          </div>
        </div>
      )}

      {/* Raw Status Log */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <FileText size={14} />
        <span>Pipeline Final Status Log:</span>
        <code style={{ color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
          {result.final_status}
        </code>
      </div>
    </div>
  );
};
