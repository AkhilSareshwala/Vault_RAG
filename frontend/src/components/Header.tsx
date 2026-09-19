import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkHealth, getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { ShieldCheck, UserCheck, Activity, Settings, LogOut, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  const { activePersona, setIsLoginModalOpen, logout } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>(getApiBaseUrl());

  useEffect(() => {
    const ping = async () => {
      const ok = await checkHealth();
      setIsOnline(ok);
    };
    ping();
    const interval = setInterval(ping, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(customUrl);
    setShowSettings(false);
    checkHealth().then(setIsOnline);
  };

  return (
    <header className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.2))',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow-cyan)'
        }}>
          <Cpu size={24} color="#38bdf8" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>VaultRAG <span style={{ color: '#38bdf8', fontSize: '0.85em' }}>v4</span></h1>
            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
              LangGraph + RLS
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Multi-Agent Resolution Engine & HITL Gate</p>
        </div>
      </div>

      {/* Center Health Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          fontSize: '0.8rem',
          fontWeight: 500,
          color: isOnline ? '#34d399' : '#f87171'
        }}>
          <Activity size={14} className={isOnline ? 'animate-pulse-glow' : ''} />
          <span>{isOnline === null ? 'Pinging API...' : isOnline ? 'API Online (8000)' : 'API Offline'}</span>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 0.2s'
          }}
          title="Configure API Endpoint"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Right User Persona Badge & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {activePersona ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: activePersona.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: '#000'
              }}>
                {activePersona.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{activePersona.name}</div>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.05rem 0.4rem',
                  borderRadius: '3px',
                  background: activePersona.badgeBg,
                  color: activePersona.badgeText,
                  fontWeight: 600
                }}>
                  {activePersona.title}
                </span>
              </div>
              <UserCheck size={14} color="var(--text-muted)" style={{ marginLeft: '0.3rem' }} />
            </button>

            <button
              onClick={logout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Logout session"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-agent)',
              color: '#000',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ShieldCheck size={16} />
            <span>Select Persona</span>
          </button>
        )}
      </div>

      {/* Config URL Drawer */}
      {showSettings && (
        <form
          onSubmit={handleSaveUrl}
          style={{
            position: 'absolute',
            top: '4.5rem',
            right: '1.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            zIndex: 50,
            width: '320px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>FastAPI Backend URL</div>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.85rem',
              marginBottom: '0.75rem'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              style={{
                background: 'none',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: 'var(--accent-agent)',
                border: 'none',
                color: '#000',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Save
            </button>
          </div>
        </form>
      )}
    </header>
  );
};
