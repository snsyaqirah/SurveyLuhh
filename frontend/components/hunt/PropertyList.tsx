'use client';

import { useSwipeable } from 'react-swipeable';
import { useState } from 'react';
import type { Property } from '@/lib/types';

const SOURCE_LABEL: Record<string, string> = {
  propertyguru: 'PropertyGuru',
  mudah: 'Mudah',
  iproperty: 'iProperty',
};

interface PropertyListItemProps {
  property: Property;
  isActive: boolean;
  onSelect: () => void;
  onStatusUpdate: (status: Property['status']) => void;
}

function PropertyListItem({ property, isActive, onSelect, onStatusUpdate }: PropertyListItemProps) {
  const [swipeAction, setSwipeAction] = useState<'shortlist' | 'reject' | null>(null);

  const handlers = useSwipeable({
    onSwipedRight: () => {
      setSwipeAction('shortlist');
      onStatusUpdate('shortlisted');
      setTimeout(() => setSwipeAction(null), 600);
    },
    onSwipedLeft: () => {
      setSwipeAction('reject');
      onStatusUpdate('rejected');
      setTimeout(() => setSwipeAction(null), 600);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const statusBadge = {
    shortlisted: { label: 'Shortlisted', bg: '#F0FDF4', color: '#16A34A' },
    rejected:    { label: 'Rejected',    bg: '#FEF2F2', color: '#DC2626' },
    none:        null,
  }[property.status];

  const swipeBg =
    swipeAction === 'shortlist' ? '#F0FDF4' :
    swipeAction === 'reject'    ? '#FEF2F2' : undefined;

  const swipeBar =
    swipeAction === 'shortlist' ? '#22C55E' :
    swipeAction === 'reject'    ? '#EF4444' : undefined;

  return (
    <div
      {...handlers}
      onClick={onSelect}
      className="relative flex gap-3 p-3 cursor-pointer transition-all select-none"
      style={{
        borderBottom: '1px solid #F3F0FF',
        background: swipeBg ?? (isActive ? '#F3F0FF' : '#FFFFFF'),
      }}
      onMouseEnter={e => { if (!isActive && !swipeBg) (e.currentTarget as HTMLDivElement).style.background = '#FAF8FF'; }}
      onMouseLeave={e => { if (!isActive && !swipeBg) (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF'; }}
    >
      {swipeBar && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l"
          style={{ background: swipeBar }}
        />
      )}

      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: '#F3F0FF' }}
      >
        {property.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#C2C8D8" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: '#282F41' }}>
          {property.title}
        </p>
        <p className="text-xs font-semibold" style={{ color: '#265CE4' }}>
          {property.price}
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {property.source && (
            <span
              className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: '#EBF0FE', color: '#265CE4' }}
            >
              {SOURCE_LABEL[property.source] ?? property.source}
            </span>
          )}
          {statusBadge && (
            <span
              className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: statusBadge.bg, color: statusBadge.color }}
            >
              {statusBadge.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface PropertyListProps {
  properties: Property[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
  onStatusUpdate: (propertyId: string, status: Property['status']) => void;
}

export default function PropertyList({ properties, activePropertyId, onSelect, onStatusUpdate }: PropertyListProps) {
  return (
    <div
      className="w-72 shrink-0 flex flex-col overflow-hidden"
      style={{ borderRight: '1px solid #E2DFF0', background: '#FFFFFF' }}
    >
      <div className="p-3 shrink-0" style={{ borderBottom: '1px solid #E2DFF0' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9DA3B8' }}>
          {properties.length} {properties.length === 1 ? 'Property' : 'Properties'}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#C2C8D8' }}>
          Swipe right to shortlist · left to reject
        </p>
      </div>
      <div className="overflow-y-auto flex-1">
        {properties.map(property => (
          <PropertyListItem
            key={property.id}
            property={property}
            isActive={property.id === activePropertyId}
            onSelect={() => onSelect(property.id)}
            onStatusUpdate={status => onStatusUpdate(property.id, status)}
          />
        ))}
      </div>
    </div>
  );
}
