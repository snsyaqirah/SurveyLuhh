'use client';

import { useState, useEffect } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import type { Property } from '@/lib/types';
import { scrapeProperty, checkHealth } from '@/lib/api';

const SUPPORTED_DOMAINS = ['mudah.my'];
const BLOCKED_DOMAINS = ['propertyguru.com.my', 'iproperty.com.my'];

interface HomeTabProps {
  sessionId: string;
  nickname: string;
  onPropertyAdded: (property: Property) => void;
}

type ScrapePhase = 'idle' | 'validating' | 'opening' | 'reading' | 'photos' | 'done' | 'error';
type BackendStatus = 'checking' | 'waking' | 'live' | 'unknown';

const PHASE_MESSAGES: Partial<Record<ScrapePhase, string>> = {
  validating: 'Validating link...',
  opening:    'Opening page...',
  reading:    'Reading property details...',
  photos:     'Grabbing photos...',
  done:       'Done!',
};

function isValidPropertyUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return SUPPORTED_DOMAINS.some(d => u.hostname.endsWith(d));
  } catch {
    return false;
  }
}

function isBlockedDomain(value: string): boolean {
  try {
    const u = new URL(value);
    return BLOCKED_DOMAINS.some(d => u.hostname.endsWith(d));
  } catch {
    return false;
  }
}

function isPropertyGuru(value: string): boolean {
  try {
    return new URL(value).hostname.endsWith('propertyguru.com.my');
  } catch {
    return false;
  }
}

function isIProperty(value: string): boolean {
  try {
    return new URL(value).hostname.endsWith('iproperty.com.my');
  } catch {
    return false;
  }
}

export default function HomeTab({ sessionId, nickname, onPropertyAdded }: HomeTabProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<ScrapePhase>('idle');
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  // Proactively wake the backend on mount
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function ping() {
      const alive = await checkHealth();
      if (cancelled) return;
      if (alive) {
        setBackendStatus('live');
        // Stop polling once live
      } else {
        setBackendStatus('waking');
        // Poll every 5s while waking
        pollTimer = setTimeout(ping, 5_000);
      }
    }

    ping();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  const isLoading = ['validating', 'opening', 'reading', 'photos'].includes(phase);
  const showPGWarning = url.trim() && isPropertyGuru(url);
  const showIPropWarning = url.trim() && isIProperty(url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isBlockedDomain(url)) {
      setError('This site is blocked by bot protection and cannot be scraped from our server. Only Mudah.my is supported.');
      setPhase('error');
      return;
    }

    if (!isValidPropertyUrl(url)) {
      setError('Please paste a valid Mudah.my link.');
      return;
    }

    if (!executeRecaptcha) {
      setPhase('error');
      setError('reCAPTCHA not ready. Please try again.');
      return;
    }

    setPhase('validating');
    await new Promise(r => setTimeout(r, 300));
    setPhase('opening');

    try {
      const recaptchaToken = await executeRecaptcha('scrape');
      const result = await scrapeProperty({ url, sessionId, recaptchaToken, nickname });

      if (result.property) {
        setPhase('done');
        onPropertyAdded(result.property);
        setUrl('');
        setTimeout(() => setPhase('idle'), 800);
      } else {
        setPhase('error');
        setError(result.error || 'Could not scrape that listing. Please try again.');
      }
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-4 py-6"
      style={{ background: '#FAF8FF' }}
    >
      <div className="w-full max-w-xl space-y-5">

        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-semibold" style={{ color: '#282F41' }}>
              Paste your property link
            </h2>
            {/* Persistent backend status pill */}
            {backendStatus === 'checking' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#F3F0FF', color: '#7C3AED', border: '1px solid #D6CCFF' }}>
                <div className="w-2 h-2 rounded-full border animate-spin"
                  style={{ borderColor: 'rgba(124,58,237,0.25)', borderTopColor: '#7C3AED' }} />
                Checking...
              </span>
            )}
            {backendStatus === 'waking' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                <div className="w-2 h-2 rounded-full border animate-spin"
                  style={{ borderColor: 'rgba(217,119,6,0.25)', borderTopColor: '#D97706' }} />
                Waking up (~30–60s)
              </span>
            )}
            {backendStatus === 'live' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                Live
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full font-medium"
              style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
              ✓ Mudah.my
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full font-medium"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              ✗ iProperty (Akamai block)
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full font-medium"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              ✗ PropertyGuru (Cloudflare block)
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={e => {
              setUrl(e.target.value);
              setError('');
              if (phase === 'error') setPhase('idle');
            }}
            placeholder="https://www.mudah.my/..."
            disabled={isLoading}
            className="w-full px-4 py-3.5 rounded-xl text-sm transition-all outline-none disabled:opacity-50"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2DFF0',
              color: '#282F41',
              minHeight: '48px',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#265CE4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(38,92,228,0.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E2DFF0'; e.currentTarget.style.boxShadow = 'none'; }}
          />

          {showPGWarning && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>
                <b>Heads up:</b> PropertyGuru is currently protected by Cloudflare bot detection. Scraping may return incomplete data.
              </span>
            </div>
          )}

          {showIPropWarning && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>
                <b>Heads up:</b> iProperty is currently protected by Akamai bot detection. Scraping may return incomplete data.
              </span>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98]"
            style={{
              background: isLoading || !url.trim() ? 'rgba(38,92,228,0.3)' : '#265CE4',
              minHeight: '48px',
            }}
          >
            {isLoading ? 'Surveying...' : 'Survey Luhh'}
          </button>
        </form>

        {isLoading && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
              style={{ borderColor: 'rgba(38,92,228,0.2)', borderTopColor: '#265CE4' }}
            />
            <span className="text-sm" style={{ color: '#5A6280' }}>
              {PHASE_MESSAGES[phase] ?? 'Working...'}
            </span>
          </div>
        )}

        {phase === 'done' && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm" style={{ color: '#16A34A' }}>
              Property added! Switching to Properties tab...
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <div className="h-px flex-1" style={{ background: '#E2DFF0' }} />
          <span className="text-xs" style={{ color: '#C2C8D8' }}>Protected by reCAPTCHA</span>
          <div className="h-px flex-1" style={{ background: '#E2DFF0' }} />
        </div>

        <p className="text-center text-[11px]" style={{ color: '#C2C8D8' }}>
          <a href="/privacy" style={{ color: '#9DA3B8' }}>Privacy Policy</a>
          {' · '}
          <a href="mailto:snsyaqirah@gmail.com" style={{ color: '#9DA3B8' }}>Contact</a>
        </p>
      </div>
    </div>
  );
}
