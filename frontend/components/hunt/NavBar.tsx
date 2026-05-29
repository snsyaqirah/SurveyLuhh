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
  const expiresAt = new Date(new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const expiresOn = expiresAt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  return { daysLeft, expiresOn };
}

export default function NavBar({ activeTab, onTabChange, members = [], nickname, sessionCreatedAt }: NavBarProps) {
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
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

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Expiry indicator */}
        {expiry && (
          <div className="relative">
            <button
              onClick={() => setShowExpiry(v => !v)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors"
              style={{
                color: expiry.daysLeft <= 3 ? '#DC2626' : expiry.daysLeft <= 7 ? '#D97706' : '#9DA3B8',
                border: '1px solid #E2DFF0',
                background: showExpiry ? '#F3F0FF' : '#FFFFFF',
                minHeight: '36px',
              }}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{expiry.daysLeft}d</span>
              <span className="hidden sm:inline"> left</span>
            </button>

            {showExpiry && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExpiry(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 z-50 rounded-xl px-3 py-2.5 text-xs whitespace-nowrap"
                  style={{
                    background: '#282F41',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                    minWidth: 220,
                  }}
                >
                  <p className="font-semibold mb-0.5">Session auto-deletes in {expiry.daysLeft} day{expiry.daysLeft !== 1 ? 's' : ''}</p>
                  <p style={{ color: '#9DA3B8' }}>Expires {expiry.expiresOn} — save links before then!</p>
                  <div className="absolute right-3 -top-1 w-2 h-2 rotate-45" style={{ background: '#282F41' }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Share + Members panel */}
        <div className="relative">
          <button
            onClick={() => setShowShare(v => !v)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors active:scale-95"
            style={{
              color: showShare ? '#265CE4' : '#5A6280',
              border: '1px solid #E2DFF0',
              background: showShare ? '#EBF0FE' : '#FFFFFF',
              minHeight: '36px',
            }}
            onMouseEnter={e => { if (!showShare) (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF'; }}
            onMouseLeave={e => { if (!showShare) (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
            {/* Member count badge */}
            {members.length > 0 && (
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
                style={{ background: onlineMembers.length > 0 ? '#22C55E' : '#9DA3B8' }}
              >
                {members.length}
              </span>
            )}
          </button>

          {showShare && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
              <div
                className="absolute right-0 top-full mt-1.5 z-50 rounded-2xl p-4 space-y-4"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2DFF0',
                  boxShadow: '0 8px 32px rgba(38,92,228,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  minWidth: 260,
                  maxWidth: 320,
                }}
              >
                {/* Members list */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9DA3B8' }}>
                    In this session {members.length > 0 && `(${members.length})`}
                  </p>

                  {members.length === 0 ? (
                    <p className="text-sm" style={{ color: '#C2C8D8' }}>
                      No one else yet — share the link!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {members.map(m => {
                        const online = isOnline(m.lastSeen);
                        const isYou = m.nickname === nickname;
                        return (
                          <div key={m.nickname} className="flex items-center gap-2.5">
                            {/* Avatar */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ background: avatarColor(m.nickname) }}
                            >
                              {m.nickname[0].toUpperCase()}
                            </div>

                            {/* Name */}
                            <span className="text-sm font-medium flex-1 truncate" style={{ color: '#282F41' }}>
                              {m.nickname}
                              {isYou && (
                                <span className="ml-1 text-[10px] font-normal" style={{ color: '#9DA3B8' }}>
                                  (you)
                                </span>
                              )}
                            </span>

                            {/* Online dot */}
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              title={online ? 'Online' : 'Offline'}
                              style={{ background: online ? '#22C55E' : '#E2DFF0' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Copy link */}
                <div style={{ borderTop: '1px solid #F3F0FF', paddingTop: '12px' }}>
                  <button
                    onClick={copyLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: copied ? '#F0FDF4' : '#EBF0FE',
                      color: copied ? '#16A34A' : '#265CE4',
                    }}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Link copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy session link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
