import Link from 'next/link';

interface ChangeEntry {
  type: 'feat' | 'fix' | 'improvement';
  text: string;
}

interface Version {
  version: string;
  date: string;
  label?: string;
  changes: ChangeEntry[];
}

const VERSIONS: Version[] = [
  {
    version: '0.4.0',
    date: '2025-05-15',
    label: 'Latest',
    changes: [
      { type: 'feat',        text: 'Feedback board — send anonymous feedback, devs can reply, view at /feedback' },
      { type: 'feat',        text: 'Admin panel at /admin — view, filter, and reply to all feedback' },
      { type: 'fix',         text: 'Bracket tournament now advances correctly with 9+ properties (BYE slot bug fixed)' },
      { type: 'fix',         text: 'Session TTL index now properly enforces 7-day auto-delete even after server restarts' },
      { type: 'improvement', text: 'Feedback form adapts per category — bug reports get an extra "Suggested fix" field' },
    ],
  },
  {
    version: '0.3.0',
    date: '2025-05-01',
    changes: [
      { type: 'feat',        text: 'iProperty scraper — fetches listing data via Next.js JSON API endpoints' },
      { type: 'improvement', text: 'Selenium fallback now supports stealth mode for bot-protected sites (Cloudflare)' },
      { type: 'fix',         text: 'Scraping pipeline updated to use curl_cffi with homepage session warmup' },
      { type: 'fix',         text: 'Better error messages for unsupported domains in the URL input' },
    ],
  },
  {
    version: '0.2.0',
    date: '2025-04-15',
    changes: [
      { type: 'feat',        text: 'Bracket tournament in Insight tab — pick your favourite property head-to-head' },
      { type: 'feat',        text: 'Collaborative sessions — share a link, multiple people can add and vote together' },
      { type: 'feat',        text: 'Property status — shortlist or reject listings to keep things organised' },
      { type: 'improvement', text: 'Session expiry countdown shown in the navbar (7-day auto-delete)' },
    ],
  },
  {
    version: '0.1.0',
    date: '2025-04-01',
    changes: [
      { type: 'feat', text: 'Initial release — paste a mudah.my listing URL, get the details scraped automatically' },
      { type: 'feat', text: 'Shareable session dashboard — properties, price, rooms, agent contact in one place' },
    ],
  },
];

const TYPE_META: Record<ChangeEntry['type'], { label: string; color: string; bg: string }> = {
  feat:        { label: 'New',         color: '#265CE4', bg: '#EBF0FE' },
  fix:         { label: 'Fix',         color: '#DC2626', bg: '#FEF2F2' },
  improvement: { label: 'Improved',   color: '#7C3AED', bg: '#F5F3FF' },
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen" style={{ background: '#FAF8FF' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E2DFF0' }}
      >
        <Link href="/" className="font-bold text-base" style={{ color: '#282F41' }}>
          SurveyLuhh
        </Link>
        <span className="text-sm font-medium" style={{ color: '#5A6280' }}>Changelog</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* About section */}
        <div
          className="rounded-2xl p-6 space-y-3"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: '#265CE4' }}
            >
              SL
            </div>
            <div>
              <h1 className="font-bold text-base" style={{ color: '#282F41' }}>SurveyLuhh</h1>
              <p className="text-xs" style={{ color: '#9DA3B8' }}>v{VERSIONS[0].version} · Built for Malaysian house hunters</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#5A6280' }}>
            Stop copy-pasting property links into WhatsApp. SurveyLuhh scrapes Malaysian listing sites
            and puts everything — price, rooms, agent, photos — into one shareable dashboard you can
            browse together with your partner, housemates, or family.
          </p>
          <div className="flex gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#265CE4' }}
            >
              Try it
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ color: '#265CE4', background: '#EBF0FE' }}
            >
              Feedback board
            </Link>
          </div>
        </div>

        {/* Version list */}
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9DA3B8' }}>Version history</h2>
        </div>

        <div className="space-y-6">
          {VERSIONS.map((v, vi) => (
            <div key={v.version} className="flex gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: vi === 0 ? '#265CE4' : '#E2DFF0', border: vi === 0 ? '2px solid #265CE4' : '2px solid #E2DFF0' }}
                />
                {vi < VERSIONS.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: '#E2DFF0', minHeight: 32 }} />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-sm" style={{ color: '#282F41' }}>v{v.version}</span>
                  {v.label && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: '#265CE4' }}
                    >
                      {v.label}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: '#9DA3B8' }}>{v.date}</span>
                </div>

                <div
                  className="rounded-xl divide-y overflow-hidden"
                  style={{ border: '1px solid #E2DFF0', background: '#FFFFFF', borderColor: '#E2DFF0' }}
                >
                  {v.changes.map((c, ci) => {
                    const tm = TYPE_META[c.type];
                    return (
                      <div key={ci} className="flex items-start gap-3 px-4 py-3">
                        <span
                          className="mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ background: tm.bg, color: tm.color }}
                        >
                          {tm.label}
                        </span>
                        <p className="text-sm leading-snug" style={{ color: '#282F41' }}>{c.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-center pb-8" style={{ color: '#C2C8D8' }}>
          Made with a lot of caffeine · snsyaqirah@gmail.com
          {' · '}
          <Link href="/privacy" style={{ color: '#9DA3B8' }}>Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
