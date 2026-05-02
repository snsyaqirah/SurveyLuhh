'use client';

import { useState } from 'react';
import type { TabId } from '@/app/hunt/[sessionId]/page';
import type { Member } from '@/lib/types';

interface NavBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  sessionId: string;
  propertyCount: number;
  members?: Member[];
  nickname?: string | null;
  sessionCreatedAt?: string | null;
}

const TABS: { id: TabId; label: string; shortLabel: string }[] = [
  { id: 'home',       label: 'Home',       shortLabel: 'Home'    },
  { id: 'properties', label: 'Properties', shortLabel: 'Props'   },
  { id: 'insight',    label: 'Insight',    shortLabel: 'Insight' },
];

const AVATAR_COLORS = [
  '#265CE4', '#7C3AED', '#DB2777', '#EA580C',
  '#16A34A', '#0891B2', '#D97706', '#DC2626',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 60 * 60 * 1000;
}

function getExpiryInfo(createdAt: string): { daysLeft: number; expiresOn: string } {
  const expiresAt = new Date(new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const expiresOn = expiresAt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  return { daysLeft, expiresOn };
}

export default function NavBar({ activeTab, onTabChange, members = [], nickname, sessionCreatedAt }: NavBarProps) {
  const [copied, setCopied] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onlineMembers = members.filter(m => isOnline(m.lastSeen));
  const expiry = sessionCreatedAt ? getExpiryInfo(sessionCreatedAt) : null;

  return (
    <header
      className="no-print sticky top-0 z-50 flex items-center justify-between px-3 sm:px-6 py-2.5 shrink-0 gap-2"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E2DFF0' }}
    >
      {/* Logo */}
      <span className="font-bold text-base sm:text-lg tracking-tight shrink-0" style={{ color: '#282F41' }}>
        SurveyLuhh
      </span>

      {/* Tabs */}
      <nav className="flex gap-0.5 sm:gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors"
            style={
              activeTab === tab.id
                ? { color: '#265CE4', background: '#EBF0FE' }
                : { color: '#9DA3B8' }
            }
            onMouseEnter={e => {
              if (activeTab !== tab.id) {
                (e.currentTarget as HTMLButtonElement).style.color = '#5A6280';
                (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) {
                (e.currentTarget as HTMLButtonElement).style.color = '#9DA3B8';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Right side: members + expiry + share */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Online member avatars */}
        {onlineMembers.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-1.5">
            {onlineMembers.slice(0, 4).map(m => (
              <div
                key={m.nickname}
                title={m.nickname + (m.nickname === nickname ? ' (you)' : '')}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
                style={{ background: avatarColor(m.nickname) }}
              >
                {m.nickname[0].toUpperCase()}
              </div>
            ))}
            {onlineMembers.length > 4 && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white"
                style={{ background: '#F3F0FF', color: '#5A6280' }}
              >
                +{onlineMembers.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Expiry indicator */}
        {expiry && (
          <div
            className="relative"
            onMouseEnter={() => setShowExpiry(true)}
            onMouseLeave={() => setShowExpiry(false)}
          >
            <button
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors"
              style={{
                color: expiry.daysLeft <= 1 ? '#DC2626' : expiry.daysLeft <= 3 ? '#D97706' : '#9DA3B8',
                border: '1px solid #E2DFF0',
                background: '#FFFFFF',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">{expiry.daysLeft}d left</span>
            </button>

            {showExpiry && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 rounded-xl px-3 py-2.5 text-xs whitespace-nowrap"
                style={{
                  background: '#282F41',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  minWidth: 220,
                }}
              >
                <p className="font-semibold mb-0.5">This session auto-deletes in {expiry.daysLeft} day{expiry.daysLeft !== 1 ? 's' : ''}</p>
                <p style={{ color: '#9DA3B8' }}>Expires on {expiry.expiresOn} — save your links before then!</p>
                <div
                  className="absolute right-3 -top-1 w-2 h-2 rotate-45"
                  style={{ background: '#282F41' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Share */}
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors"
          style={{ color: '#5A6280', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden sm:inline" style={{ color: '#16A34A' }}>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
