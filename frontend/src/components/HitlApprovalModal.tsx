import React, { useState } from 'react';
import { QueryResponse, ResumeResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { resumePipeline } from '../api/client';
import { ShieldAlert, CheckCircle2, XCircle, DollarSign, Mail, AlertTriangle } from 'lucide-react';

interface HitlApprovalModalProps {
  lastResult: QueryResponse | null;
  onResumed: (result: ResumeResponse) => void;
}

export const HitlApprovalModal: React.FC<HitlApprovalModalProps> = ({ lastResult, onResumed }) => {
  const { token } = useAuth();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!lastResult || !lastResult.interrupted || !lastResult.interrupt_payload) {
    return null;
  }

  const payload = lastResult.interrupt_payload;
  const risk = lastResult.risk || payload.risk_assessment || {};

  const handleDecision = async (approved: boolean) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await resumePipeline(
        lastResult.thread_id,
        { approved, reason: approved ? 'Approved via HITL Console' : 'Denied by human supervisor' },
        token
      );
      onResumed(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          padding: '2rem',
          background: 'rgba(13, 17, 26, 0.96)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          boxShadow: 'var(--shadow-glow-danger)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        {/* Header Alert Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          marginBottom: '1.5rem'
        }}>
          <ShieldAlert size={28} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>
              Human-in-the-Loop Approval Gate Triggered
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {payload.message || 'High-risk refund requires human review before dispatching resolution email.'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Risk Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <DollarSign size={14} color="#f59e0b" />
              <span>Disputed Refund Amount</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
              ${(risk.refund_amount || 0).toFixed(2)}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#fbbf24' }}>
              Threshold Limit: $100.00
            </span>
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <AlertTriangle size={14} color="#f59e0b" />
              <span>Assessment Reason</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {risk.reason || 'Exceeds threshold'}
            </div>
          </div>
        </div>

        {/* Draft Email Preview */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Mail size={16} color="#38bdf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Draft Email for Review</span>
          </div>
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: '#e2e8f0',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            maxHeight: '180px',
            overflowY: 'auto'
          }}>
            {payload.draft_email || 'No draft provided'}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => handleDecision(false)}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: submitting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <XCircle size={18} />
            <span>Deny & Hold Review</span>
          </button>

          <button
            onClick={() => handleDecision(true)}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: submitting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
            }}
          >
            <CheckCircle2 size={18} />
            <span>Approve & Send Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};
