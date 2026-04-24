'use client';

import { useState } from 'react';
import type { Property } from '@/lib/types';
import { scrapeProperty } from '@/lib/api';

const SUPPORTED_DOMAINS = ['propertyguru.com.my', 'mudah.my', 'iproperty.com.my'];

interface HomeTabProps {
  sessionId: string;
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

export default function HomeTab({ sessionId, onPropertyAdded }: HomeTabProps) {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<ScrapePhase>('idle');
  const [error, setError] = useState('');

  const isLoading = ['validating', 'opening', 'reading', 'photos'].includes(phase);

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
      const recaptchaToken = 'dev-bypass'; // TODO: wire NEXT_PUBLIC_RECAPTCHA_SITE_KEY
      const result = await scrapeProperty({ url, sessionId, recaptchaToken });

      setPhase('done');
      if (result.property) {
        onPropertyAdded(result.property);
        setUrl('');
        setTimeout(() => setPhase('idle'), 800);
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
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold" style={{ color: '#282F41' }}>
            Paste your property link
          </h2>
          <p className="text-sm" style={{ color: '#5A6280' }}>
            Supports PropertyGuru, Mudah &amp; iProperty
          </p>
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
