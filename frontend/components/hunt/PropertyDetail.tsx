'use client';

import { useState } from 'react';
import type { Property } from '@/lib/types';

interface PropertyDetailProps {
  property: Property;
  onDelete?: () => void;
}

function stripNonDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export default function PropertyDetail({ property, onDelete }: PropertyDetailProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const whatsappUrl = property.agent.phone
    ? `https://wa.me/${stripNonDigits(property.agent.phone)}?text=${encodeURIComponent(
        `Hi, I'm interested in ${property.title} - ${property.url}`,
      )}`
    : null;

  return (
    <div className="p-6 space-y-5 max-w-2xl" style={{ background: '#FAF8FF' }}>

      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold leading-snug" style={{ color: '#282F41' }}>
            {property.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={{ color: '#5A6280', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PDF
            </button>
            {onDelete && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: '#DC2626', border: '1px solid #FECACA', background: '#FEF2F2' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
            {onDelete && confirmDelete && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-xs rounded-lg font-semibold"
                  style={{ background: '#DC2626', color: '#FFFFFF' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ color: '#9DA3B8', border: '1px solid #E2DFF0', background: '#FFFFFF' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-2xl font-bold" style={{ color: '#265CE4' }}>{property.price}</p>
        <a
          href={property.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs transition-colors"
          style={{ color: '#C2C8D8' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#9DA3B8'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#C2C8D8'; }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View original listing
        </a>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            onClick={() => setLightboxOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {property.images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                disabled={activeImageIndex === 0}
                onClick={e => { e.stopPropagation(); setActiveImageIndex(i => Math.max(0, i - 1)); }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                disabled={activeImageIndex === property.images.length - 1}
                onClick={e => { e.stopPropagation(); setActiveImageIndex(i => Math.min(property.images.length - 1, i + 1)); }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={property.images[activeImageIndex]}
            alt={property.title}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <span
            className="absolute bottom-4 right-4 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            {activeImageIndex + 1} / {property.images.length}
          </span>
        </div>
      )}

      {/* Image Gallery */}
      {property.images.length > 0 && (
        <div className="space-y-2">
          <div
            className="relative h-64 rounded-xl overflow-hidden cursor-zoom-in"
            style={{ background: '#F3F0FF' }}
            onClick={() => setLightboxOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={property.images[activeImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
              style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Click to enlarge
            </div>
            {property.images.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImageIndex(i => Math.max(0, i - 1)); }}
                  disabled={activeImageIndex === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.75)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#282F41" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setActiveImageIndex(i => Math.min(property.images.length - 1, i + 1)); }}
                  disabled={activeImageIndex === property.images.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.75)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#282F41" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span
                  className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.85)', color: '#282F41' }}
                >
                  {activeImageIndex + 1} / {property.images.length}
                </span>
              </>
            )}
          </div>
          {property.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {property.images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img}
                  alt=""
                  onClick={() => setActiveImageIndex(i)}
                  className="w-14 h-11 object-cover rounded-lg shrink-0 cursor-pointer transition-all"
                  style={{
                    opacity: i === activeImageIndex ? 1 : 0.4,
                    outline: i === activeImageIndex ? '2px solid #265CE4' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two-column info grid — single col on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Box 1 — Property Details */}
        <div
          className="p-4 rounded-xl space-y-3"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
        >
          <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9DA3B8' }}>
            Property Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Size',    value: property.details.sqft ? (property.details.sqft.includes('sqft') ? property.details.sqft : `${property.details.sqft} sqft`) : '—' },
              { label: 'Beds',    value: property.details.bedrooms  || '—' },
              { label: 'Baths',   value: property.details.bathrooms || '—' },
              { label: 'Parking', value: property.details.parking   || '—' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9DA3B8' }}>{item.label}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#282F41' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Box 2 — Facilities & Nearby */}
        <div
          className="p-4 rounded-xl space-y-3"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
        >
          <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9DA3B8' }}>
            Facilities &amp; Nearby
          </h3>
          {property.facilities.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9DA3B8' }}>Facilities</p>
              <div className="flex flex-wrap gap-1">
                {(showAllFacilities ? property.facilities : property.facilities.slice(0, 5)).map((f, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: '#F3F0FF', color: '#5A6280' }}
                  >
                    {f}
                  </span>
                ))}
                {property.facilities.length > 5 && (
                  <button
                    onClick={() => setShowAllFacilities(v => !v)}
                    className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                    style={{ background: '#EBF0FE', color: '#265CE4' }}
                  >
                    {showAllFacilities ? 'Show less' : `+${property.facilities.length - 5} more`}
                  </button>
                )}
              </div>
            </div>
          )}
          {property.nearbyPlaces.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9DA3B8' }}>Nearby</p>
              {property.nearbyPlaces.slice(0, 3).map(place => (
                <p key={place} className="text-xs" style={{ color: '#5A6280' }}>
                  📍 {place}
                </p>
              ))}
            </div>
          )}
          {property.facilities.length === 0 && property.nearbyPlaces.length === 0 && (
            <p className="text-xs" style={{ color: '#C2C8D8' }}>No info available</p>
          )}
        </div>
      </div>

      {/* About */}
      {property.description && (
        <div
          className="p-4 rounded-xl space-y-2"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
        >
          <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9DA3B8' }}>
            About
          </h3>
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{
              color: '#5A6280',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: showFullDesc ? undefined : 5,
              overflow: showFullDesc ? 'visible' : 'hidden',
            }}
          >
            {property.description}
          </p>
          {property.description.split('\n').length > 5 || property.description.length > 300 ? (
            <button
              onClick={() => setShowFullDesc(v => !v)}
              className="text-xs font-medium transition-colors"
              style={{ color: '#265CE4' }}
            >
              {showFullDesc ? 'Show less' : 'Read more'}
            </button>
          ) : null}
        </div>
      )}

      {/* Agent Card */}
      {property.agent.name && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl"
          style={{ background: '#FFFFFF', border: '1px solid #E2DFF0' }}
        >
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9DA3B8' }}>Agent</p>
            <p className="text-sm font-semibold" style={{ color: '#282F41' }}>{property.agent.name}</p>
            {property.agent.phone && (
              <a
                href={`tel:${property.agent.phone}`}
                className="text-xs transition-colors"
                style={{ color: '#9DA3B8' }}
              >
                {property.agent.phone}
              </a>
            )}
          </div>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all shrink-0"
              style={{ background: '#22C55E' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp Agent
            </a>
          )}
        </div>
      )}
    </div>
  );
}
