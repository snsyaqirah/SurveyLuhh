'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import ApartmentSVG from '@/components/landing/ApartmentSVG';

export default function LandingPage() {
  const router = useRouter();

  const handleStart = () => {
    router.push(`/hunt/${uuidv4()}`);
  };

  return (
    <main
      className="min-h-screen w-full flex items-center py-12"
      style={{ background: '#FAF8FF' }}
    >
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 md:grid-cols-2 items-center gap-10 lg:gap-12">

        {/* Left — Copy */}
        <div className="space-y-7">
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: '#265CE4' }}
          >
            SurveyLuhh
          </p>

          <h1
            className="text-4xl sm:text-[3.2rem] font-bold leading-[1.13] tracking-tight"
            style={{ color: '#282F41' }}
          >
            Stop copy&#8209;pasting,{' '}
            <span className="italic" style={{ color: '#265CE4' }}>
              start scraping.
            </span>
          </h1>

          <p className="text-base leading-relaxed max-w-md" style={{ color: '#5A6280' }}>
            Automatically extract details from property listings and share them
            with friends for easy comparison.
          </p>

          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:brightness-110 active:scale-[0.98] shadow-md"
            style={{ background: '#265CE4' }}
          >
            Lessego!
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        {/* Right — Property Card (hidden on small mobile, visible md+) */}
        <div className="hidden sm:flex justify-center">
          <div
            className="relative w-full max-w-[460px] h-[320px] sm:h-[360px] rounded-2xl overflow-hidden"
            style={{
              boxShadow: '0 20px 60px rgba(38, 92, 228, 0.14), 0 4px 16px rgba(38, 92, 228, 0.08)',
              border: '1.5px solid rgba(255,255,255,0.9)',
            }}
          >
            {/* Apartment SVG fills top area */}
            <div className="absolute inset-0 bottom-[70px]">
              <ApartmentSVG />
            </div>

            {/* Bottom info overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4"
              style={{
                height: '70px',
                borderLeft: '4px solid #265CE4',
              }}
            >
              <p className="font-semibold text-sm leading-snug" style={{ color: '#282F41' }}>
                Tropicana Gardens Residence
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9DA3B8' }}>
                Petaling Jaya, Selangor &nbsp;·&nbsp; RM 2,800 / month
              </p>
            </div>

            {/* Teal lightning badge */}
            <div className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-lg bg-teal-400">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L4.5 13.5H11L10 22L20.5 10.5H14L13 2Z" />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
