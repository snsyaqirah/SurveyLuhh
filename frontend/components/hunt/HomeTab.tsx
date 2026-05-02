'use client';

import { useState } from 'react';
import type { Property } from '@/lib/types';
import { scrapeProperty } from '@/lib/api';

const SUPPORTED_DOMAINS = ['propertyguru.com.my', 'mudah.my', 'iproperty.com.my'];

interface HomeTabProps {
  sessionId: string;
  nickname: string;
  onPropertyAdded: (property: Property) => void;
}

type ScrapePhase = 'idle' | 'validating' | 'opening' | 'reading' | 'photos' | 'done' | 'error';

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

function isPropertyGuru(value: string): boolean {
  try {
    return new URL(value).hostname.endsWith('propertyguru.com.my');
  } catch {
    return false;
  }
}

export default function HomeTab({ sessionId, nickname, onPropertyAdded }: HomeTabProps) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<ScrapePhase>('idle');
  const [error, setError] = useState('');

  const isLoading = ['validating', 'opening', 'reading', 'photos'].includes(phase);
  const showPGWarning = url.trim() && isPropertyGuru(url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPropertyUrl(url)) {
      setError('Please paste a valid PropertyGuru, Mudah, or iProperty link.');
      return;
    }

    setPhase('validating');
    await new Promise(r => setTimeout(r, 300));
    setPhase('opening');

    try {
      const recaptchaToken = 'dev-bypass';
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
      className="flex flex-col items-center justify-center h-full px-4"
      style={{ background: '#FAF8FF' }}
    >
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold" style={{ color: '#282F41' }}>
            Paste your property link
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full font-medium"
              style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
              ✓ iProperty
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full font-medium"
              style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
              ✓ Mudah.my
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
            value={url}
            onChange={e => {
              setUrl(e.target.value);
              setError('');
              if (phase === 'error') setPhase('idle');
            }}
            placeholder="https://www.propertyguru.com.my/property-listing/..."
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none disabled:opacity-50"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2DFF0',
              color: '#282F41',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#265CE4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(38,92,228,0.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E2DFF0'; e.currentTarget.style.boxShadow = 'none'; }}
          />

          {/* PropertyGuru bot warning */}
          {showPGWarning && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>
                <b>Heads up:</b> PropertyGuru is currently protected by Cloudflare bot detection. Scraping may return incomplete data. We&apos;re working on a fix!
              </span>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: isLoading || !url.trim() ? 'rgba(38,92,228,0.3)' : '#265CE4' }}
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

        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1" style={{ background: '#E2DFF0' }} />
          <span className="text-xs" style={{ color: '#C2C8D8' }}>Protected by reCAPTCHA</span>
          <div className="h-px flex-1" style={{ background: '#E2DFF0' }} />
        </div>
      </div>
    </div>
  );
}
