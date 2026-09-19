import { LoginResponse, QueryResponse, ResumeResponse } from '../types';

let API_BASE_URL = 'http://localhost:8000';

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url.replace(/\/$/, '');
};

export const getApiBaseUrl = () => API_BASE_URL;

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || `Login failed with status ${res.status}`);
  }

  return res.json();
}

export async function queryPipeline(
  query: string,
  ticketRef: string | null,
  token: string
): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      ticket_ref: ticketRef && ticketRef.trim() ? ticketRef.trim() : null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Query failed' }));
    throw new Error(err.detail || `Query failed with status ${res.status}`);
  }

  return res.json();
}

export async function resumePipeline(
  threadId: string,
  decision: { approved: boolean; reason?: string },
  token: string
): Promise<ResumeResponse> {
  const res = await fetch(`${API_BASE_URL}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      thread_id: threadId,
      decision,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Resume decision failed' }));
    throw new Error(err.detail || `Resume failed with status ${res.status}`);
  }

  return res.json();
}
