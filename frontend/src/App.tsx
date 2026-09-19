import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { QueryInput } from './components/QueryInput';
import { GraphVisualizer } from './components/GraphVisualizer';
import { HitlApprovalModal } from './components/HitlApprovalModal';
import { ResolutionCard } from './components/ResolutionCard';
import { ThreadHistory } from './components/ThreadHistory';
import { SystemOverview } from './components/SystemOverview';
import { queryPipeline } from './api/client';
import { QueryResponse, ResumeResponse, ThreadRecord } from './types';
import { AlertCircle } from 'lucide-react';

const MainWorkspace: React.FC = () => {
  const { token, activePersona, role, setIsLoginModalOpen } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<QueryResponse | ResumeResponse | null>(null);
  const [history, setHistory] = useState<ThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const handleQuerySubmit = async (query: string, ticketRef: string) => {
    if (!token) {
      setIsLoginModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await queryPipeline(query, ticketRef, token);
      setLastResult(res);
      setActiveThreadId(res.thread_id);

      const record: ThreadRecord = {
        id: res.thread_id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        query,
        ticket_ref: ticketRef || undefined,
        persona: activePersona?.name || 'User',
        role: role || 'support_agent',
        final_status: res.final_status,
        draft_email: res.draft_email,
        risk: res.risk,
        interrupted: res.interrupted,
        interrupt_payload: res.interrupt_payload,
      };

      setHistory((prev) => [record, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResumed = (res: ResumeResponse) => {
    setLastResult(res);
    setHistory((prev) =>
      prev.map((item) =>
        item.id === res.thread_id
          ? {
              ...item,
              final_status: res.final_status,
              draft_email: res.draft_email,
              risk: res.risk,
              resumed: true,
              interrupted: false,
            }
          : item
      )
    );
  };

  const handleSelectThread = (record: ThreadRecord) => {
    setActiveThreadId(record.id);
    const simulated: QueryResponse = {
      thread_id: record.id,
      final_status: record.final_status,
      draft_email: record.draft_email,
      risk: record.risk,
      interrupted: record.interrupted && !record.resumed,
      interrupt_payload: record.interrupt_payload,
    };
    setLastResult(simulated);
  };

  return (
    <div className="app-container">
      <Header />

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Primary Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <QueryInput onSubmit={handleQuerySubmit} loading={loading} />

          <GraphVisualizer
            lastResult={lastResult}
            loading={loading}
            activePersonaRole={role}
          />

          <ResolutionCard result={lastResult} />

          <SystemOverview />
        </div>

        {/* Right Sidebar Audit Column */}
        <div style={{ height: '100%', position: 'sticky', top: '1.5rem' }}>
          <ThreadHistory
            records={history}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onClearHistory={() => setHistory([])}
          />
        </div>
      </div>

      <LoginModal />

      <HitlApprovalModal
        lastResult={lastResult && 'interrupted' in lastResult && lastResult.interrupted ? (lastResult as QueryResponse) : null}
        onResumed={handleResumed}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <div className="ambient-bg" />
      <MainWorkspace />
    </AuthProvider>
  );
}

export default App;
