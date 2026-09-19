import React, { useState } from 'react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { Shield, Key, ArrowRight, UserCheck } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, loginAsPersona, loginCustom, activePersona, loading } = useAuth();
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isLoginModalOpen && activePersona) return null;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await loginCustom(customUsername, customPassword);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials');
    }
  };

  const handlePersonaSelect = async (username: string) => {
    setErrorMsg(null);
    try {
      await loginAsPersona(username);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate persona');
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '2rem',
          background: 'rgba(13, 17, 26, 0.95)',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            padding: '0.6rem',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>
            <Shield size={24} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Select Authenticated Persona</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              JWT Authentication assigns role-based access for Postgres RLS queries
            </p>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Demo Persona Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Object.values(DEMO_PERSONAS).map((persona) => {
            const isSelected = activePersona?.username === persona.username;
            return (
              <button
                key={persona.username}
                onClick={() => handlePersonaSelect(persona.username)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? `1px solid ${persona.avatarColor}` : '1px solid var(--border-subtle)',
                  cursor: loading ? 'wait' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: persona.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#000',
                    fontSize: '1rem'
                  }}>
                    {persona.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{persona.name}</span>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: persona.badgeBg,
                        color: persona.badgeText,
                        fontWeight: 600
                      }}>
                        {persona.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {persona.description}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <UserCheck size={18} color={persona.avatarColor} />
                ) : (
                  <ArrowRight size={16} color="var(--text-muted)" />
                )}
              </button>
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '1rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.75rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>or sign in manually</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Custom Login Form */}
        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Username"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="password"
              placeholder="Password"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Key size={14} />
            <span>Login</span>
          </button>
        </form>

        {activePersona && (
          <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
            <button
              onClick={() => setIsLoginModalOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Close dialog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
