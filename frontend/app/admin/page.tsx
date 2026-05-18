'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type Category = 'bug' | 'enhancement' | 'general' | 'testimonial';

interface FeedbackItem {
  id: string;
  category: Category;
  message: string;
  suggestedFix?: string | null;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  read: boolean;
}

const CATEGORY_META: Record<Category, { emoji: string; label: string; color: string; bg: string }> = {
  bug:         { emoji: '🐛', label: 'Bug Report',  color: '#DC2626', bg: '#FEF2F2' },
  enhancement: { emoji: '✨', label: 'Enhancement', color: '#7C3AED', bg: '#F5F3FF' },
  general:     { emoji: '💬', label: 'General',     color: '#0891B2', bg: '#ECFEFF' },
  testimonial: { emoji: '⭐', label: 'Testimonial', color: '#D97706', bg: '#FFFBEB' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function apiFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('request failed');
  return res.json();
}

export default function AdminPage() {
  const [token, setToken]         = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [authed, setAuthed]       = useState(false);
  const [checking, setChecking]   = useState(false);
  const [authError, setAuthError] = useState('');

  const [items, setItems]         = useState<FeedbackItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replying, setReplying]   = useState<string | null>(null);
  const [filter, setFilter]       = useState<Category | 'all'>('all');

  // Restore token from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('surveyluhh_admin_token');
    if (saved) {
      setToken(saved);
      setAuthed(true);
    }
  }, []);

  const loadFeedback = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/feedback', t);
      setItems(data);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'unauthorized') {
        setAuthed(false);
        setToken('');
        sessionStorage.removeItem('surveyluhh_admin_token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && token) loadFeedback(token);
  }, [authed, token, loadFeedback]);

  async function handleLogin() {
    if (!tokenInput.trim()) return;
    setChecking(true);
    setAuthError('');
    try {
      await apiFetch('/api/feedback', tokenInput.trim());
      sessionStorage.setItem('surveyluhh_admin_token', tokenInput.trim());
      setToken(tokenInput.trim());
      setAuthed(true);
    } catch {
      setAuthError('Wrong token. Try again.');
    } finally {
      setChecking(false);
    }
  }

  async function handleReply(id: string) {
    const reply = (replyDraft[id] ?? '').trim();
    if (!reply) return;
    setReplying(id);
    try {
      await apiFetch(`/api/feedback/${id}/reply`, token, {
        method: 'PATCH',
        body: JSON.stringify({ reply }),
      });
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, reply, repliedAt: new Date().toISOString() } : item
      ));
      setReplyDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    } finally {
      setReplying(null);
    }
  }

  function logout() {
    sessionStorage.removeItem('surveyluhh_admin_token');
    setAuthed(false);
    setToken('');
    setItems([]);
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAF8FF' }}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 space-y-5"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0', boxShadow: '0 8px 32px rgba(38,92,228,0.10)' }}
        >
          <div className="space-y-1">
            <h1 className="font-bold text-lg" style={{ color: '#282F41' }}>Admin · SurveyLuhh</h1>
            <p className="text-sm" style={{ color: '#9DA3B8' }}>Enter your admin token to continue.</p>
          </div>
          <input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Admin token"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ border: '1.5px solid #E2DFF0', color: '#282F41', background: '#FAFAFA' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#265CE4')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E2DFF0')}
          />
          {authError && <p className="text-xs" style={{ color: '#DC2626' }}>{authError}</p>}
          <button
            onClick={handleLogin}
            disabled={checking || !tokenInput.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tokenInput.trim() && !checking ? '#265CE4' : '#E2DFF0',
              color: tokenInput.trim() && !checking ? '#FFFFFF' : '#9DA3B8',
            }}
          >
            {checking ? 'Checking…' : 'Enter'}
          </button>
        </div>
      </main>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const unread = items.filter(i => !i.read).length;
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  return (
    <main className="min-h-screen" style={{ background: '#FAF8FF' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E2DFF0' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-base" style={{ color: '#282F41' }}>SurveyLuhh · Feedback</span>
          {unread > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
              style={{ background: '#265CE4' }}
            >
              {unread} new
            </span>
          )}
        </div>
        <button
          onClick={logout}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#9DA3B8', border: '1px solid #E2DFF0' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3F0FF')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Sign out
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'bug', 'enhancement', 'general', 'testimonial'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: filter === f ? '#265CE4' : '#FFFFFF',
                color: filter === f ? '#FFFFFF' : '#5A6280',
                border: '1px solid #E2DFF0',
              }}
            >
              {f === 'all' ? `All (${items.length})` : `${CATEGORY_META[f].emoji} ${CATEGORY_META[f].label}`}
            </button>
          ))}
          <button
            onClick={() => loadFeedback(token)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: '#9DA3B8', border: '1px solid #E2DFF0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3F0FF')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ↻ Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: '#9DA3B8' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: '#9DA3B8' }}>No feedback yet.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const meta = CATEGORY_META[item.category];
              const draft = replyDraft[item.id] ?? '';
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-5 space-y-3"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${item.read ? '#E2DFF0' : '#265CE4'}`,
                    boxShadow: item.read ? 'none' : '0 0 0 3px rgba(38,92,228,0.08)',
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-2 justify-between">
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.emoji} {meta.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#265CE4' }} />
                      )}
                      <span className="text-[11px]" style={{ color: '#9DA3B8' }}>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#282F41' }}>
                    {item.message}
                  </p>

                  {item.suggestedFix && (
                    <div className="rounded-xl px-4 py-3 text-sm space-y-1" style={{ background: '#FEF2F2', borderLeft: '3px solid #EF4444' }}>
                      <p className="text-[11px] font-semibold" style={{ color: '#DC2626' }}>Suggested fix</p>
                      <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#282F41' }}>{item.suggestedFix}</p>
                    </div>
                  )}

                  {/* Existing reply */}
                  {item.reply && (
                    <div
                      className="rounded-xl px-4 py-3 text-sm space-y-1"
                      style={{ background: '#EBF0FE', borderLeft: '3px solid #265CE4' }}
                    >
                      <p className="text-[11px] font-semibold" style={{ color: '#265CE4' }}>
                        Your reply · {item.repliedAt ? formatDate(item.repliedAt) : ''}
                      </p>
                      <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#282F41' }}>
                        {item.reply}
                      </p>
                    </div>
                  )}

                  {/* Reply input */}
                  <div className="space-y-2">
                    <textarea
                      value={draft}
                      onChange={e => setReplyDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={item.reply ? 'Edit reply…' : 'Write a reply…'}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
                      style={{ border: '1.5px solid #E2DFF0', color: '#282F41', background: '#FAFAFA' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#265CE4')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#E2DFF0')}
                    />
                    {draft.trim() && (
                      <button
                        onClick={() => handleReply(item.id)}
                        disabled={replying === item.id}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: '#265CE4', color: '#FFFFFF' }}
                      >
                        {replying === item.id ? 'Saving…' : item.reply ? 'Update reply' : 'Reply'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
