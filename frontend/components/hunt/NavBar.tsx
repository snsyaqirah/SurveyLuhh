'use client';

import { useState } from 'react';
import type { TabId } from '@/app/hunt/[sessionId]/page';

interface NavBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  sessionId: string;
  propertyCount: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'properties', label: 'Properties' },
  { id: 'insight', label: 'Insight' },
];

export default function NavBar({ activeTab, onTabChange, propertyCount }: NavBarProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E2DFF0' }}
    >
      <span className="font-bold text-lg tracking-tight" style={{ color: '#282F41' }}>
        SurveyLuhh
      </span>

      <nav className="flex gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative px-4 py-1.5 text-sm rounded-lg font-medium transition-colors"
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
            {tab.label}
            {tab.id === 'properties' && propertyCount > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full font-bold"
                style={{ background: '#265CE4', color: 'white' }}
              >
                {propertyCount > 9 ? '9+' : propertyCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors"
        style={{ color: '#5A6280', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
        }}
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs" style={{ color: '#16A34A' }}>Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-xs">Share</span>
          </>
        )}
      </button>
    </header>
  );
}
