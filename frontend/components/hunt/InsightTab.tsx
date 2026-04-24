'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Property, BracketMatch, BracketRounds } from '@/lib/types';

interface InsightTabProps {
  properties: Property[];
  sessionId: string;
}

function nextPowerOf2(n: number): number {
  if (n <= 2) return 2;
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

function buildFirstRound(propertyIds: string[]): BracketMatch[] {
  const size = nextPowerOf2(propertyIds.length);
  const padded: (string | null)[] = [...propertyIds];
  while (padded.length < size) padded.push(null);

  return Array.from({ length: size / 2 }, (_, i) => {
    const left  = padded[i * 2];
    const right = padded[i * 2 + 1] ?? null;
    return {
      id:       `0-${i}`,
      leftId:   left,
      rightId:  right,
      winnerId: right === null ? left : null,
    };
  });
}

interface SavedBracket {
  rounds: BracketRounds;
  currentRound: number;
  winnerId: string | null;
}

const bracketKey = (sessionId: string) => `bracket_${sessionId}`;

export default function InsightTab({ properties, sessionId }: InsightTabProps) {
  const [rounds,       setRounds]       = useState<BracketRounds>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [started,      setStarted]      = useState(false);
  const [winnerId,     setWinnerId]     = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(bracketKey(sessionId));
    if (!saved) return;
    try {
      const { rounds: r, currentRound: cr, winnerId: w } = JSON.parse(saved) as SavedBracket;
      setRounds(r); setCurrentRound(cr); setWinnerId(w); setStarted(true);
    } catch { /* corrupted — start fresh */ }
  }, [sessionId]);

  const persist = useCallback((r: BracketRounds, cr: number, w: string | null) => {
    localStorage.setItem(bracketKey(sessionId), JSON.stringify({ rounds: r, currentRound: cr, winnerId: w }));
  }, [sessionId]);

  const startTournament = useCallback(() => {
    const first = buildFirstRound(properties.map(p => p.id));
    setRounds([first]); setCurrentRound(0); setWinnerId(null); setStarted(true);
    persist([first], 0, null);
  }, [properties, persist]);

  const pickWinner = (matchIndex: number, pickedId: string) => {
    const updatedRound = rounds[currentRound].map((m, mi) =>
      mi === matchIndex ? { ...m, winnerId: pickedId } : m,
    );
    const updatedRounds = rounds.map((r, ri) => ri === currentRound ? updatedRound : r);

    if (!updatedRound.every(m => m.winnerId !== null)) {
      setRounds(updatedRounds);
      persist(updatedRounds, currentRound, null);
      return;
    }

    const winners = updatedRound.map(m => m.winnerId!);

    if (winners.length === 1) {
      setRounds(updatedRounds); setWinnerId(winners[0]);
      persist(updatedRounds, currentRound, winners[0]);
      return;
    }

    const nextRound: BracketMatch[] = Array.from(
      { length: Math.ceil(winners.length / 2) }, (_, i) => {
        const left  = winners[i * 2];
        const right = winners[i * 2 + 1] ?? null;
        return { id: `${currentRound + 1}-${i}`, leftId: left, rightId: right, winnerId: right === null ? left : null };
      }
    );

    const newRounds = [...updatedRounds, nextRound];
    const next = currentRound + 1;

    if (nextRound.length === 1 && nextRound[0].winnerId !== null) {
      setRounds(newRounds); setWinnerId(nextRound[0].winnerId!);
      persist(newRounds, next, nextRound[0].winnerId!);
    } else {
      setRounds(newRounds); setCurrentRound(next);
      persist(newRounds, next, null);
    }
  };

  const getProperty = (id: string | null) => id ? properties.find(p => p.id === id) : undefined;

  const roundLabel = (() => {
    const matches = rounds[currentRound]?.length ?? 0;
    if (matches === 1) return 'Final';
    if (matches === 2) return 'Semi-finals';
    if (matches === 4) return 'Quarter-finals';
    return `Round ${currentRound + 1}`;
  })();

  // ── Not enough properties ──
  if (properties.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: '#FAF8FF' }}>
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="#E2DFF0" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm" style={{ color: '#9DA3B8' }}>Add at least 2 properties to start a tournament.</p>
      </div>
    );
  }

  // ── Not started ──
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6" style={{ background: '#FAF8FF' }}>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold" style={{ color: '#282F41' }}>Property Tournament</h2>
          <p className="text-sm" style={{ color: '#5A6280' }}>
            {properties.length} properties · Single elimination
          </p>
          <p className="text-xs" style={{ color: '#9DA3B8' }}>
            Pick your favourite in each matchup until one winner emerges.
          </p>
        </div>
        <button
          onClick={startTournament}
          className="px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all"
          style={{ background: '#265CE4' }}
        >
          Start Tournament
        </button>
      </div>
    );
  }

  // ── Winner screen ──
  if (winnerId) {
    const winner = getProperty(winnerId);
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6" style={{ background: '#FAF8FF' }}>
        <div className="text-center space-y-1">
          <p className="text-5xl">🏆</p>
          <h2 className="text-xl font-semibold mt-2" style={{ color: '#282F41' }}>Your Winner</h2>
          <p className="text-xs" style={{ color: '#9DA3B8' }}>Based on your picks</p>
        </div>
        {winner && (
          <div
            className="w-72 p-4 rounded-xl space-y-3"
            style={{ background: '#FFFFFF', border: '1.5px solid rgba(38,92,228,0.4)' }}
          >
            {winner.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={winner.images[0]} alt="" className="w-full h-40 object-cover rounded-lg" />
            )}
            <p className="text-sm font-semibold leading-snug" style={{ color: '#282F41' }}>{winner.title}</p>
            <p className="font-bold text-sm" style={{ color: '#265CE4' }}>{winner.price}</p>
          </div>
        )}
        <button
          onClick={startTournament}
          className="text-sm transition-colors px-4 py-2 rounded-lg"
          style={{ color: '#9DA3B8', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
        >
          Restart Tournament
        </button>
      </div>
    );
  }

  // ── Active matchups ──
  const currentMatches = rounds[currentRound] ?? [];

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#FAF8FF' }}>
      <div className="p-6 space-y-5 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#282F41' }}>{roundLabel}</h2>
            <p className="text-xs" style={{ color: '#9DA3B8' }}>
              Round {currentRound + 1} · {currentMatches.filter(m => !m.winnerId).length} matchup(s) remaining
            </p>
          </div>
          <button
            onClick={startTournament}
            className="text-xs transition-colors"
            style={{ color: '#C2C8D8' }}
          >
            Restart
          </button>
        </div>

        <div className="space-y-4">
          {currentMatches.map((match, mi) => {
            if (match.winnerId) {
              const w = getProperty(match.winnerId);
              return (
                <div
                  key={match.id}
                  className="p-3 rounded-xl"
                  style={{ background: '#F3F0FF', border: '1px solid #E2DFF0' }}
                >
                  <p className="text-xs text-center" style={{ color: '#C2C8D8' }}>
                    Auto-advanced: <span style={{ color: '#9DA3B8' }}>{w?.title ?? 'BYE'}</span>
                  </p>
                </div>
              );
            }

            const left  = getProperty(match.leftId);
            const right = getProperty(match.rightId);

            return (
              <div
                key={match.id}
                className="p-4 rounded-xl"
                style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
              >
                <p className="text-xs text-center mb-3" style={{ color: '#9DA3B8' }}>
                  Pick your favourite
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { prop: left,  id: match.leftId  },
                    { prop: right, id: match.rightId },
                  ] as { prop: Property | undefined; id: string | null }[]).map(({ prop, id }, side) => (
                    <button
                      key={side}
                      onClick={() => id && pickWinner(mi, id)}
                      disabled={!id}
                      className="flex flex-col gap-2 p-3 rounded-xl text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background: '#FAF8FF', border: '1.5px solid #E2DFF0' }}
                      onMouseEnter={e => {
                        if (id) {
                          (e.currentTarget as HTMLButtonElement).style.background = '#EBF0FE';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#265CE4';
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#FAF8FF';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2DFF0';
                      }}
                    >
                      {prop?.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={prop.images[0]} alt="" className="w-full h-28 object-cover rounded-lg" />
                      ) : (
                        <div
                          className="w-full h-28 rounded-lg flex items-center justify-center"
                          style={{ background: '#F3F0FF' }}
                        >
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#E2DFF0" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
                          </svg>
                        </div>
                      )}
                      <p className="text-xs font-medium line-clamp-2 leading-snug" style={{ color: '#282F41' }}>
                        {prop?.title ?? 'BYE'}
                      </p>
                      <p className="text-xs font-semibold" style={{ color: '#265CE4' }}>{prop?.price ?? ''}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
