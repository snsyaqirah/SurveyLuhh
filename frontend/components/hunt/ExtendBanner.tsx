'use client';

import { useState, useEffect } from 'react';
import { extendSession } from '@/lib/api';

interface ExtendBannerProps {
  sessionId: string;
  expiresAt: string;
  extensionCount: number;
  onExtended: (newExpiresAt: string, newCount: number) => void;
}

const MAX_EXTENSIONS = 3;

function getDaysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExtendBanner({ sessionId, expiresAt, extensionCount, onExtended }: ExtendBannerProps) {
  const [daysLeft, setDaysLeft] = useState(getDaysLeft(expiresAt));
  const [extending, setExtending] = useState<7 | 30 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDaysLeft(getDaysLeft(expiresAt));
    setDismissed(false);
  }, [expiresAt]);

  if (daysLeft > 7 || dismissed) return null;

  const extensionsLeft = MAX_EXTENSIONS - extensionCount;
  const maxed = extensionsLeft <= 0;
  const urgent = daysLeft <= 2;

  const handleExtend = async (days: 7 | 30) => {
    setExtending(days);
    setError(null);
    try {
      const result = await extendSession(sessionId, days);
      onExtended(result.expiresAt, result.extensionCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extend');
    } finally {
      setExtending(null);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 text-xs shrink-0"
      style={{
        background: urgent ? '#FEF2F2' : '#FFFBEB',
        borderBottom: `1px solid ${urgent ? '#FECACA' : '#FDE68A'}`,
        color: urgent ? '#DC2626' : '#92400E',
      }}
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <span className="flex-1 min-w-0">
        {error ? (
          <span style={{ color: '#DC2626' }}>{error}</span>
        ) : (
          <>
            Session expires in{' '}
            <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>
            {' '}— {formatExpiry(expiresAt)}
            {maxed && <span className="ml-1 opacity-60">(max extensions reached)</span>}
          </>
        )}
      </span>

      {!maxed && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="opacity-50 hidden sm:inline">{extensionsLeft}/{MAX_EXTENSIONS} left</span>
          <button
            onClick={() => handleExtend(7)}
            disabled={extending !== null}
            className="px-2.5 py-1 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: urgent ? '#FCA5A5' : '#FDE68A',
              color: urgent ? '#7F1D1D' : '#78350F',
            }}
          >
            {extending === 7 ? '…' : '+1 week'}
          </button>
          <button
            onClick={() => handleExtend(30)}
            disabled={extending !== null}
            className="px-2.5 py-1 rounded-lg font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: urgent ? '#DC2626' : '#D97706' }}
          >
            {extending === 30 ? '…' : '+1 month'}
          </button>
        </div>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-40 hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
