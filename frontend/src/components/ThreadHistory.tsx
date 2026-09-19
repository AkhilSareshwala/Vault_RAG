import React from 'react';
import { ThreadRecord } from '../types';
import { History, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ThreadHistoryProps {
  records: ThreadRecord[];
  activeThreadId: string | null;
  onSelectThread: (record: ThreadRecord) => void;
  onClearHistory: () => void;
}

export const ThreadHistory: React.FC<ThreadHistoryProps> = ({
  records,
  activeThreadId,
  onSelectThread,
  onClearHistory,
}) => {
  return (
    <div className="glass-card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Thread Audit Trail</h3>
        </div>
        {records.length > 0 && (
          <button
            onClick={onClearHistory}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          textAlign: 'center',
          padding: '2rem 1rem',
          gap: '0.5rem'
        }}>
          <Clock size={28} opacity={0.3} />
          <span>No thread history yet. Submit a query to see the execution graph in action.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
          {records.map((rec) => {
            const isSelected = activeThreadId === rec.id;
            const isSent = rec.final_status.startsWith('EMAIL_SENT');
            const isDenied = rec.final_status.startsWith('DENIED');
            const isInterrupted = rec.interrupted && !rec.resumed;

            return (
              <button
                key={rec.id}
                onClick={() => onSelectThread(rec)}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {rec.timestamp}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '3px',
                    background: rec.risk?.risk_level === 'high' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: rec.risk?.risk_level === 'high' ? '#fbbf24' : '#34d399',
                    fontWeight: 600
                  }}>
                    {rec.risk?.risk_level === 'high' ? 'HIGH RISK' : 'LOW RISK'}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {rec.query}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Persona:</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#38bdf8' }}>{rec.persona}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    {isSent && <CheckCircle2 size={12} color="#34d399" />}
                    {isDenied && <XCircle size={12} color="#f87171" />}
                    {isInterrupted && <AlertTriangle size={12} color="#fbbf24" />}
                    <span style={{
                      fontSize: '0.65rem',
                      color: isSent ? '#34d399' : isDenied ? '#f87171' : '#fbbf24'
                    }}>
                      {isSent ? 'Sent' : isDenied ? 'Denied' : 'Paused'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
