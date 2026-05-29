'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NicknameModalProps {
  onConfirm: (nickname: string) => void;
  existingMembers?: string[];
}

export default function NicknameModal({ onConfirm, existingMembers = [] }: NicknameModalProps) {
  const [value, setValue] = useState('');
  const [consented, setConsented] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (name) onConfirm(name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(40,47,65,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl space-y-5"
        style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: '#282F41' }}>
            Welcome! 👋
          </h2>
          <p className="text-sm" style={{ color: '#5A6280' }}>
            {existingMembers.length > 0
              ? 'Pick your name or enter a new one.'
              : 'What should we call you in this session?'}
          </p>
        </div>

        {/* Rejoin as existing member */}
        {existingMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: '#9DA3B8' }}>Rejoin as</p>
            <div className="flex flex-wrap gap-2">
              {existingMembers.map(name => (
                <button
                  key={name}
                  type="button"
                  disabled={!consented}
                  onClick={() => consented && onConfirm(name)}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: '#EBF0FE', color: '#265CE4', border: '1.5px solid #C7D7FA' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#D6E4FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EBF0FE'; }}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px" style={{ background: '#E2DFF0' }} />
              <span className="text-xs" style={{ color: '#C2C8D8' }}>or join as someone new</span>
              <div className="flex-1 h-px" style={{ background: '#E2DFF0' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. John Doe, John Cena, etc."
            maxLength={30}
            autoFocus={existingMembers.length === 0}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: '#FAF8FF',
              border: '1.5px solid #E2DFF0',
              color: '#282F41',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#265CE4';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(38,92,228,0.08)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#E2DFF0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {/* Consent notice */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consented}
              onChange={e => setConsented(e.target.checked)}
              className="mt-0.5 shrink-0 accent-[#265CE4]"
            />
            <span className="text-xs leading-relaxed" style={{ color: '#5A6280' }}>
              Your nickname and session activity are stored for 30 days, then auto-deleted.{' '}
              <Link href="/privacy" target="_blank" style={{ color: '#265CE4' }}>
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={!value.trim() || !consented}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all"
            style={{ background: value.trim() && consented ? '#265CE4' : 'rgba(38,92,228,0.3)' }}
          >
            Let&apos;s go!
          </button>
        </form>
      </div>
    </div>
  );
}
