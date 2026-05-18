'use client';

import { useState } from 'react';

type Category = 'bug' | 'enhancement' | 'general' | 'testimonial';

const CATEGORIES: { id: Category; emoji: string; label: string; desc: string }[] = [
  { id: 'bug',         emoji: '🐛', label: 'Bug Report',  desc: "Something's broken"    },
  { id: 'enhancement', emoji: '✨', label: 'Enhancement', desc: 'Make it better'         },
  { id: 'general',     emoji: '💬', label: 'General',     desc: 'Anything else'          },
  { id: 'testimonial', emoji: '⭐', label: 'Testimonial', desc: 'Share your experience'  },
];

const FIELD_META: Record<Category, { messageLabel: string; messagePlaceholder: string; hasFixField: boolean }> = {
  bug: {
    messageLabel: 'Describe the issue*',
    messagePlaceholder: 'What happened? What did you expect to happen?',
    hasFixField: true,
  },
  enhancement: {
    messageLabel: 'Your message*',
    messagePlaceholder: 'What feature or improvement would you like to see?',
    hasFixField: false,
  },
  general: {
    messageLabel: 'Your message*',
    messagePlaceholder: 'Share anything on your mind…',
    hasFixField: false,
  },
  testimonial: {
    messageLabel: 'Your message*',
    messagePlaceholder: "How's your experience using SurveyLuhh?",
    hasFixField: false,
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function postFeedback(category: Category, message: string, suggestedFix?: string) {
  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, message, suggestedFix: suggestedFix || undefined }),
  });
  if (!res.ok) throw new Error('Failed to submit');
}

export default function FeedbackButton() {
  const [open, setOpen]             = useState(false);
  const [category, setCategory]     = useState<Category | null>(null);
  const [message, setMessage]       = useState('');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  function close() {
    setOpen(false);
    setCategory(null);
    setMessage('');
    setSuggestedFix('');
    setError('');
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (!category || !message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await postFeedback(category, message.trim(), suggestedFix.trim() || undefined);
      setSubmitted(true);
      setTimeout(close, 2200);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const meta = category ? FIELD_META[category] : null;
  const canSubmit = category !== null && message.trim().length > 0 && !submitting;

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] select-none"
        style={{ background: '#265CE4', color: '#FFFFFF', boxShadow: '0 4px 18px rgba(38,92,228,0.35)' }}
        aria-label="Send feedback"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Send Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="fixed inset-0"
            style={{ background: 'rgba(40,47,65,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={close}
          />

          <div
            className="relative w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 20px 60px rgba(38,92,228,0.15), 0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid #E2DFF0',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base" style={{ color: '#282F41' }}>Send Feedback</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9DA3B8' }}>Anonymous · Read by the dev</p>
              </div>
              <button
                onClick={close}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
                style={{ color: '#9DA3B8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F3F0FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="py-10 text-center space-y-2">
                <div className="text-3xl">🎉</div>
                <p className="font-semibold text-sm" style={{ color: '#282F41' }}>Thanks for the feedback!</p>
                <p className="text-xs" style={{ color: '#9DA3B8' }}>It really means a lot.</p>
              </div>
            ) : (
              <>
                {/* Category picker */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#9DA3B8' }}>Category</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => { setCategory(cat.id); setMessage(''); setSuggestedFix(''); }}
                          className="p-3 rounded-xl text-left transition-all active:scale-[0.98]"
                          style={{
                            border: active ? '1.5px solid #265CE4' : '1.5px solid #E2DFF0',
                            background: active ? '#EBF0FE' : '#FFFFFF',
                          }}
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF'; }}
                          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
                        >
                          <div className="text-base mb-0.5">{cat.emoji}</div>
                          <div className="text-xs font-semibold" style={{ color: active ? '#265CE4' : '#282F41' }}>{cat.label}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: '#9DA3B8' }}>{cat.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category-specific fields */}
                {meta && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: '#5A6280' }}>{meta.messageLabel}</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={meta.messagePlaceholder}
                        rows={3}
                        className="w-full text-sm rounded-xl px-3 py-2.5 resize-none outline-none transition-colors"
                        style={{ border: '1.5px solid #E2DFF0', color: '#282F41', background: '#FAFAFA' }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#265CE4')}
                        onBlur={e => (e.currentTarget.style.borderColor = '#E2DFF0')}
                      />
                      <p className="text-[11px] mt-1" style={{ color: '#9DA3B8' }}>
                        Do not include personal info (phone numbers, IC numbers, email addresses).
                      </p>
                    </div>

                    {meta.hasFixField && (
                      <div>
                        <label className="text-xs font-medium block mb-1" style={{ color: '#5A6280' }}>Suggested fix</label>
                        <textarea
                          value={suggestedFix}
                          onChange={e => setSuggestedFix(e.target.value)}
                          placeholder="Optional — any idea how to fix it?"
                          rows={2}
                          className="w-full text-sm rounded-xl px-3 py-2.5 resize-none outline-none transition-colors"
                          style={{ border: '1.5px solid #E2DFF0', color: '#282F41', background: '#FAFAFA' }}
                          onFocus={e => (e.currentTarget.style.borderColor = '#265CE4')}
                          onBlur={e => (e.currentTarget.style.borderColor = '#E2DFF0')}
                        />
                      </div>
                    )}

                    {error && <p className="text-xs" style={{ color: '#DC2626' }}>{error}</p>}

                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                      style={{
                        background: canSubmit ? '#265CE4' : '#E2DFF0',
                        color: canSubmit ? '#FFFFFF' : '#9DA3B8',
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {submitting ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
