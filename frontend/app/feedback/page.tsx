'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type Category = 'bug' | 'enhancement' | 'general' | 'testimonial';

interface FeedbackItem {
  id: string;
  category: Category;
  message: string;
  suggestedFix?: string | null;
  createdAt: string;
  reply: string;
  repliedAt: string;
}

const CATEGORY_META: Record<Category, { emoji: string; label: string; color: string; bg: string }> = {
  bug:         { emoji: '🐛', label: 'Bug Report',  color: '#DC2626', bg: '#FEF2F2' },
  enhancement: { emoji: '✨', label: 'Enhancement', color: '#7C3AED', bg: '#F5F3FF' },
  general:     { emoji: '💬', label: 'General',     color: '#0891B2', bg: '#ECFEFF' },
  testimonial: { emoji: '⭐', label: 'Testimonial', color: '#D97706', bg: '#FFFBEB' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function FeedbackPage() {
  const [items, setItems]     = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Category | 'all'>('all');

  useEffect(() => {
    fetch(`${API_BASE}/api/feedback/public`)
      .then(r => r.json())
      .then(data => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  return (
    <main className="min-h-screen" style={{ background: '#FAF8FF' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E2DFF0' }}
      >
        <Link href="/" className="font-bold text-base" style={{ color: '#282F41' }}>
          SurveyLuhh
        </Link>
        <span className="text-sm font-medium" style={{ color: '#5A6280' }}>Feedback & Replies</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Intro */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: '#282F41' }}>Feedback Board</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#5A6280' }}>
            Real feedback from users — with replies from the dev. Got something to say?
            Use the <span className="font-medium" style={{ color: '#265CE4' }}>Send Feedback</span> button.
          </p>
        </div>

        {/* Filter */}
        {items.length > 0 && (
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
                {f === 'all'
                  ? `All (${items.length})`
                  : `${CATEGORY_META[f].emoji} ${CATEGORY_META[f].label}`}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-sm" style={{ color: '#9DA3B8' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl space-y-2"
            style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
          >
            <p className="text-2xl">💬</p>
            <p className="text-sm font-medium" style={{ color: '#9DA3B8' }}>
              {items.length === 0 ? 'No feedback yet.' : 'No feedback in this category.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(item => {
              const meta = CATEGORY_META[item.category];
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-2 justify-between">
                    <span
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="text-[11px]" style={{ color: '#9DA3B8' }}>{formatDate(item.createdAt)}</span>
                  </div>

                  {/* Message */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#282F41' }}>
                    {item.message}
                  </p>

                  {item.suggestedFix && (
                    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FEF2F2', borderLeft: '3px solid #EF4444' }}>
                      <p className="text-[11px] font-semibold mb-1" style={{ color: '#DC2626' }}>Suggested fix</p>
                      <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#282F41' }}>{item.suggestedFix}</p>
                    </div>
                  )}

                  {/* Dev reply */}
                  <div
                    className="rounded-xl px-4 py-3 space-y-1"
                    style={{ background: '#EBF0FE', borderLeft: '3px solid #265CE4' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold" style={{ color: '#265CE4' }}>Dev reply</span>
                      <span className="text-[11px]" style={{ color: '#9DA3B8' }}>· {formatDate(item.repliedAt)}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#282F41' }}>
                      {item.reply}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-col items-center gap-1 text-xs pb-8" style={{ color: '#C2C8D8' }}>
          <div className="flex items-center gap-2">
            <Link href="/privacy" style={{ color: '#9DA3B8' }}>Privacy Policy</Link>
            <span>·</span>
            <Link href="/changelog" style={{ color: '#9DA3B8' }}>Changelog</Link>
          </div>
          <span>
            &copy; {new Date().getFullYear()}{' '}
            <a href="https://syaqi.dev" target="_blank" rel="noopener noreferrer" style={{ color: '#9DA3B8' }}>Syaqirah</a>
          </span>
        </div>
      </div>
    </main>
  );
}
