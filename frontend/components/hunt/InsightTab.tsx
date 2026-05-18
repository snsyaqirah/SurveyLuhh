'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Property, BracketMatch, BracketRounds, BracketResult } from '@/lib/types';
import { saveBracketResult } from '@/lib/api';

interface InsightTabProps {
  properties: Property[];
  sessionId: string;
  nickname: string;
  memberToken?: string;
  bracketResults: BracketResult[];
  onBracketResult: (winnerId: string) => void;
}

// ── Confetti ──────────────────────────────────────────────────────────────

function spawnConfetti() {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9999',
  });
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d')!;
  const COLORS = ['#265CE4', '#7C3AED', '#EC4899', '#F59E0B', '#22C55E', '#EF4444', '#F97316'];
  const particles = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 5,
    vy: 2 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.25,
    alpha: 1,
  }));
  let frame = 0;
  const tick = () => {
    if (frame++ > 200) { canvas.remove(); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.06;
      if (frame > 150) p.alpha = Math.max(0, p.alpha - 0.02);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    requestAnimationFrame(tick);
  };
  tick();
}

// ── Bracket logic ─────────────────────────────────────────────────────────

function nextPowerOf2(n: number): number {
  if (n <= 2) return 2;
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

function buildFirstRound(ids: string[]): BracketMatch[] {
  const size = nextPowerOf2(ids.length);
  const padded: (string | null)[] = [...ids];
  while (padded.length < size) padded.push(null);
  return Array.from({ length: size / 2 }, (_, i) => {
    const left = padded[i * 2];
    const right = padded[i * 2 + 1] ?? null;
    return { id: `0-${i}`, leftId: left, rightId: right, winnerId: right === null ? left : null };
  });
}

function getRoundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semi-final';
  if (fromEnd === 2) return 'Quarter-final';
  return `Round ${roundIndex + 1}`;
}

function computeTotalRounds(firstRoundSize: number): number {
  if (firstRoundSize <= 1) return 1;
  return Math.ceil(Math.log2(firstRoundSize)) + 1;
}

interface SavedBracket {
  rounds: BracketRounds;
  currentRound: number;
  winnerId: string | null;
  sourceIds: string[];
}

const bracketKey = (sessionId: string, nickname: string) =>
  `bracket_${sessionId}_${nickname || 'anon'}`;
const favKey = (sessionId: string) => `surveyluhh_favorites_${sessionId}`;

// ── Bracket match card ─────────────────────────────────────────────────────

interface MatchCardProps {
  match: BracketMatch;
  properties: Property[];
  isCurrentRound: boolean;
  onPick: (id: string) => void;
  roundDone: boolean;
}

function PropertyRow({
  prop,
  isWinner,
  isLoser,
  isPending,
  isBye,
  onClick,
}: {
  prop: Property | undefined;
  isWinner: boolean;
  isLoser: boolean;
  isPending: boolean;
  isBye: boolean;
  onClick?: () => void;
}) {
  if (isBye) {
    return (
      <div className="px-3 py-2 text-xs italic" style={{ color: '#C2C8D8' }}>BYE</div>
    );
  }
  if (!prop) {
    return (
      <div className="px-3 py-2 text-xs" style={{ color: '#C2C8D8' }}>TBD</div>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={!isPending}
      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all disabled:cursor-default"
      style={{
        background: isWinner ? '#EBF0FE' : 'transparent',
        opacity: isLoser ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (isPending) (e.currentTarget as HTMLButtonElement).style.background = '#F3F0FF';
      }}
      onMouseLeave={e => {
        if (isPending) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {prop.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={prop.images[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center" style={{ background: '#F3F0FF' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#C2C8D8" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
          </svg>
        </div>
      )}
      <span className="text-xs font-medium leading-tight line-clamp-2 flex-1 min-w-0" style={{ color: isWinner ? '#265CE4' : '#282F41' }}>
        {prop.title}
      </span>
      {isWinner && (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#265CE4" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {isPending && (
        <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded font-semibold" style={{ background: '#265CE4', color: '#fff' }}>Pick</span>
      )}
    </button>
  );
}

function MatchCard({ match, properties, isCurrentRound, onPick, roundDone }: MatchCardProps) {
  const leftProp  = match.leftId  ? properties.find(p => p.id === match.leftId)  : undefined;
  const rightProp = match.rightId ? properties.find(p => p.id === match.rightId) : undefined;

  const leftWon  = match.winnerId === match.leftId;
  const rightWon = match.winnerId === match.rightId;
  const isPendingLeft  = isCurrentRound && !match.winnerId && !!match.leftId  && !!match.rightId;
  const isPendingRight = isCurrentRound && !match.winnerId && !!match.leftId  && !!match.rightId;
  const isByeLeft  = !match.leftId;
  const isByeRight = !match.rightId;

  const borderColor = isCurrentRound && !match.winnerId
    ? '#265CE4'
    : match.winnerId
    ? '#E2DFF0'
    : '#E2DFF0';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${borderColor}`,
        boxShadow: isCurrentRound && !match.winnerId
          ? '0 0 0 3px rgba(38,92,228,0.08)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        width: 200,
      }}
    >
      {isCurrentRound && !match.winnerId && (
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ background: '#265CE4', color: '#fff' }}>
          Pick your winner
        </div>
      )}
      <PropertyRow
        prop={leftProp}
        isWinner={leftWon}
        isLoser={rightWon}
        isPending={isPendingLeft}
        isBye={isByeLeft}
        onClick={() => match.leftId && onPick(match.leftId)}
      />
      <div style={{ height: 1, background: '#F3F0FF', margin: '0 8px' }} />
      <PropertyRow
        prop={rightProp}
        isWinner={rightWon}
        isLoser={leftWon}
        isPending={isPendingRight}
        isBye={isByeRight}
        onClick={() => match.rightId && onPick(match.rightId)}
      />
    </div>
  );
}

function TBDMatchCard() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#FFFFFF', border: '1.5px solid #F3F0FF', width: 200 }}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded shrink-0" style={{ background: '#F3F0FF' }} />
        <span className="text-xs" style={{ color: '#C2C8D8' }}>TBD</span>
      </div>
      <div style={{ height: 1, background: '#F3F0FF', margin: '0 8px' }} />
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded shrink-0" style={{ background: '#F3F0FF' }} />
        <span className="text-xs" style={{ color: '#C2C8D8' }}>TBD</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function InsightTab({
  properties, sessionId, nickname, memberToken, bracketResults, onBracketResult,
}: InsightTabProps) {
  const [rounds, setRounds]             = useState<BracketRounds>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [started, setStarted]           = useState(false);
  const [winnerId, setWinnerId]         = useState<string | null>(null);
  const [favorites, setFavorites]       = useState<string[]>([]);

  useEffect(() => {
    try {
      const fav: string[] = JSON.parse(localStorage.getItem(favKey(sessionId)) || '[]');
      setFavorites(fav);
    } catch { /* ignore */ }

    const saved = localStorage.getItem(bracketKey(sessionId, nickname));
    if (!saved) return;
    try {
      const { rounds: r, currentRound: cr, winnerId: w }: SavedBracket = JSON.parse(saved);
      setRounds(r); setCurrentRound(cr); setWinnerId(w); setStarted(true);
      if (w) setTimeout(spawnConfetti, 100);
    } catch { /* corrupted */ }
  }, [sessionId, nickname]);

  const persist = useCallback((r: BracketRounds, cr: number, w: string | null, sourceIds: string[]) => {
    localStorage.setItem(bracketKey(sessionId, nickname), JSON.stringify({ rounds: r, currentRound: cr, winnerId: w, sourceIds }));
  }, [sessionId, nickname]);

  const startTournament = useCallback((ids: string[]) => {
    const first = buildFirstRound(ids);
    setRounds([first]); setCurrentRound(0); setWinnerId(null); setStarted(true);
    persist([first], 0, null, ids);
  }, [persist]);

  const toggleFav = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem(favKey(sessionId), JSON.stringify(next));
  };

  const pickWinner = (matchIndex: number, pickedId: string) => {
    const updatedRound = rounds[currentRound].map((m, mi) =>
      mi === matchIndex ? { ...m, winnerId: pickedId } : m,
    );
    const updatedRounds = rounds.map((r, ri) => ri === currentRound ? updatedRound : r);

    // null-vs-null BYE slots (padding artefacts) are considered resolved
    const roundComplete = updatedRound.every(
      m => m.winnerId !== null || (m.leftId === null && m.rightId === null),
    );
    if (!roundComplete) {
      setRounds(updatedRounds);
      persist(updatedRounds, currentRound, null, []);
      return;
    }

    // collect only real winners, discarding the null-vs-null slots
    const winners = updatedRound.map(m => m.winnerId).filter((w): w is string => w !== null);

    if (winners.length === 1) {
      setRounds(updatedRounds);
      setWinnerId(winners[0]);
      persist(updatedRounds, currentRound, winners[0], []);
      onBracketResult(winners[0]);
      saveBracketResult(sessionId, nickname, winners[0], memberToken);
      setTimeout(spawnConfetti, 200);
      return;
    }

    const nextRound: BracketMatch[] = Array.from(
      { length: Math.ceil(winners.length / 2) }, (_, i) => {
        const left = winners[i * 2];
        const right = winners[i * 2 + 1] ?? null;
        return { id: `${currentRound + 1}-${i}`, leftId: left, rightId: right, winnerId: right === null ? left : null };
      },
    );

    const newRounds = [...updatedRounds, nextRound];
    const next = currentRound + 1;

    if (nextRound.length === 1 && nextRound[0].winnerId !== null) {
      const w = nextRound[0].winnerId!;
      setRounds(newRounds); setWinnerId(w);
      persist(newRounds, next, w, []);
      onBracketResult(w);
      saveBracketResult(sessionId, nickname, w);
      setTimeout(spawnConfetti, 200);
    } else {
      setRounds(newRounds); setCurrentRound(next);
      persist(newRounds, next, null, []);
    }
  };

  const resetTournament = () => {
    setRounds([]); setCurrentRound(0); setWinnerId(null); setStarted(false);
    localStorage.removeItem(bracketKey(sessionId, nickname));
  };

  const getProperty = (id: string | null) => id ? properties.find(p => p.id === id) : undefined;
  const favProperties = properties.filter(p => favorites.includes(p.id));
  const friendResults = bracketResults.filter(r => r.nickname !== nickname);

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

  // ── Winner screen ──
  if (winnerId) {
    const winner = getProperty(winnerId);
    const others = bracketResults.filter(r => r.nickname !== nickname);
    const sharedWin = others.find(r => r.winnerId === winnerId);

    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-4" style={{ background: '#FAF8FF' }}>
        <div className="text-center space-y-1">
          <p className="text-4xl">🏆</p>
          <h2 className="text-xl font-semibold mt-1" style={{ color: '#282F41' }}>Home Sweet Home!</h2>
          <p className="text-xs" style={{ color: '#9DA3B8' }}>Your tournament winner</p>
        </div>
        {winner && (
          <div
            className="w-full max-w-xs p-4 rounded-xl space-y-3"
            style={{ background: '#FFFFFF', border: '2px solid rgba(38,92,228,0.3)', boxShadow: '0 4px 24px rgba(38,92,228,0.10)' }}
          >
            {winner.images[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={winner.images[0]} alt="" className="w-full h-40 object-cover rounded-lg" />
            )}
            <p className="text-sm font-semibold leading-snug" style={{ color: '#282F41' }}>{winner.title}</p>
            <p className="font-bold text-base" style={{ color: '#265CE4' }}>{winner.price}</p>
          </div>
        )}

        {others.length > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-xs text-center font-medium" style={{ color: '#9DA3B8' }}>
              {sharedWin ? '🎉 Same winner as your partner!' : "Partner's pick"}
            </p>
            {others.map(r => {
              const theirWinner = getProperty(r.winnerId);
              return theirWinner ? (
                <div
                  key={r.nickname}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: r.winnerId === winnerId ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${r.winnerId === winnerId ? '#BBF7D0' : '#E2DFF0'}`,
                  }}
                >
                  {theirWinner.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={theirWinner.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium" style={{ color: '#9DA3B8' }}>{r.nickname}&apos;s pick</p>
                    <p className="text-xs font-semibold truncate" style={{ color: '#282F41' }}>{theirWinner.title}</p>
                  </div>
                  {r.winnerId === winnerId && <span className="text-sm ml-auto shrink-0">🤝</span>}
                </div>
              ) : null;
            })}
          </div>
        )}

        <button
          onClick={resetTournament}
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#9DA3B8', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
        >
          Restart Tournament
        </button>
      </div>
    );
  }

  // ── Active bracket tree ──
  if (started) {
    const firstRoundSize = rounds[0]?.length ?? 1;
    const totalRounds = computeTotalRounds(firstRoundSize);

    // TBD round sizes for rounds not yet built
    const tbdCounts: number[] = [];
    let size = Math.ceil((rounds[rounds.length - 1]?.length ?? 1) / 2);
    while (rounds.length + tbdCounts.length < totalRounds) {
      tbdCounts.push(size);
      size = Math.ceil(size / 2);
    }

    const pendingInCurrentRound = rounds[currentRound]?.filter(m => !m.winnerId).length ?? 0;

    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: '#FAF8FF' }}>
        {/* Header */}
        <div className="px-5 py-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #E2DFF0', background: '#FFFFFF' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#282F41' }}>
              {getRoundLabel(currentRound, totalRounds)}
            </h2>
            <p className="text-[11px]" style={{ color: '#9DA3B8' }}>
              {pendingInCurrentRound > 0
                ? `${pendingInCurrentRound} matchup${pendingInCurrentRound > 1 ? 's' : ''} to decide`
                : 'Advancing…'}
            </p>
          </div>
          <button
            onClick={resetTournament}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: '#9DA3B8', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
          >
            Restart
          </button>
        </div>

        {/* Bracket scroll area */}
        <div className="flex-1 overflow-auto p-5">
          <div className="flex items-start gap-0 w-max mx-auto">
            {/* Built rounds */}
            {rounds.map((round, ri) => {
              const label = getRoundLabel(ri, totalRounds);
              const isCurrentRound = ri === currentRound;
              const isDone = ri < currentRound;

              return (
                <div key={ri} className="flex items-start">
                  {/* Column */}
                  <div className="flex flex-col items-center" style={{ width: 200 }}>
                    {/* Round label */}
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3 py-1 rounded-full"
                      style={{
                        background: isCurrentRound ? '#265CE4' : isDone ? '#F3F0FF' : '#F3F0FF',
                        color: isCurrentRound ? '#fff' : '#9DA3B8',
                      }}
                    >
                      {label}
                    </div>

                    {/* Matches — vertically centered with equal spacing */}
                    <div className="flex flex-col items-center" style={{ gap: 12 }}>
                      {round.map((match, mi) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          properties={properties}
                          isCurrentRound={isCurrentRound}
                          roundDone={isDone}
                          onPick={(id) => isCurrentRound && pickWinner(mi, id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Arrow connector between columns */}
                  {(ri < rounds.length - 1 || tbdCounts.length > 0) && (
                    <div className="flex items-center self-stretch px-1 pt-8">
                      <div className="flex flex-col items-center gap-0.5" style={{ color: '#C2C8D8' }}>
                        <div style={{ width: 20, height: 1, background: '#E2DFF0' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* TBD future rounds */}
            {tbdCounts.map((matchCount, i) => {
              const ri = rounds.length + i;
              const label = getRoundLabel(ri, totalRounds);
              return (
                <div key={`tbd-${i}`} className="flex items-start">
                  <div className="flex flex-col items-center" style={{ width: 200 }}>
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider mb-3 px-3 py-1 rounded-full"
                      style={{ background: '#F3F0FF', color: '#C2C8D8' }}
                    >
                      {label}
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 12 }}>
                      {Array.from({ length: matchCount }, (_, mi) => (
                        <TBDMatchCard key={mi} />
                      ))}
                    </div>
                  </div>
                  {i < tbdCounts.length - 1 && (
                    <div className="flex items-center self-stretch px-1 pt-8">
                      <div style={{ width: 20, height: 1, background: '#E2DFF0' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby: pick favourites + start ──
  return (
    <div className="h-full overflow-y-auto" style={{ background: '#FAF8FF' }}>
      <div className="p-5 space-y-5 max-w-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold" style={{ color: '#282F41' }}>Property Tournament</h2>
          <p className="text-sm" style={{ color: '#5A6280' }}>
            Heart the properties you like, then start the tournament!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {properties.map(p => {
            const fav = favorites.includes(p.id);
            return (
              <div
                key={p.id}
                className="relative rounded-xl overflow-hidden"
                style={{ background: '#FFFFFF', border: `1.5px solid ${fav ? '#FCA5A5' : '#E2DFF0'}` }}
              >
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt="" className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center" style={{ background: '#F3F0FF' }}>
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#E2DFF0" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
                    </svg>
                  </div>
                )}
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-medium line-clamp-2 leading-snug" style={{ color: '#282F41' }}>{p.title}</p>
                  <p className="text-xs font-semibold" style={{ color: '#265CE4' }}>{p.price}</p>
                </div>
                <button
                  onClick={() => toggleFav(p.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ background: fav ? '#FEF2F2' : 'rgba(255,255,255,0.85)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={fav ? '#EF4444' : 'none'} stroke={fav ? '#EF4444' : '#9DA3B8'} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {friendResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9DA3B8' }}>Friends&apos; Picks</p>
            {friendResults.map(r => {
              const w = getProperty(r.winnerId);
              return w ? (
                <div
                  key={r.nickname}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
                >
                  {w.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: '#F3F0FF' }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#C2C8D8" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium" style={{ color: '#9DA3B8' }}>{r.nickname}&apos;s winner</p>
                    <p className="text-xs font-semibold truncate" style={{ color: '#282F41' }}>{w.title}</p>
                    <p className="text-xs font-bold" style={{ color: '#265CE4' }}>{w.price}</p>
                  </div>
                  <span className="text-base shrink-0">🏆</span>
                </div>
              ) : null;
            })}
          </div>
        )}

        <div className="space-y-2 pb-4">
          {favProperties.length >= 2 && (
            <button
              onClick={() => startTournament(favProperties.map(p => p.id))}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: '#EF4444' }}
            >
              ❤️ Start with {favProperties.length} Favourite{favProperties.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => startTournament(properties.map(p => p.id))}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{
              background: favProperties.length >= 2 ? '#FFFFFF' : '#265CE4',
              color: favProperties.length >= 2 ? '#5A6280' : '#FFFFFF',
              border: favProperties.length >= 2 ? '1px solid #E2DFF0' : 'none',
            }}
          >
            Start with all {properties.length} properties
          </button>
        </div>
      </div>
    </div>
  );
}
