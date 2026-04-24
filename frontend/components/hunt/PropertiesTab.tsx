'use client';

import { useState, useEffect, useRef } from 'react';
import type { Property } from '@/lib/types';
import PropertyList from './PropertyList';
import PropertyDetail from './PropertyDetail';

interface PropertiesTabProps {
  properties: Property[];
  onStatusUpdate: (propertyId: string, status: Property['status']) => void;
  onDelete: (propertyId: string) => void;
  loading: boolean;
}

export default function PropertiesTab({ properties, onStatusUpdate, onDelete, loading }: PropertiesTabProps) {
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (properties.length > prevLengthRef.current && properties.length > 0) {
      setActivePropertyId(properties[properties.length - 1].id);
    } else if (!activePropertyId && properties.length > 0) {
      setActivePropertyId(properties[0].id);
    }
    prevLengthRef.current = properties.length;
  }, [properties, activePropertyId]);

  const activeProperty = properties.find(p => p.id === activePropertyId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#FAF8FF' }}>
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: '#E2DFF0', borderTopColor: '#265CE4' }}
        />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ background: '#FAF8FF' }}
      >
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="#E2DFF0" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
        </svg>
        <p className="text-sm" style={{ color: '#9DA3B8' }}>No properties yet.</p>
        <p className="text-xs" style={{ color: '#C2C8D8' }}>Head to Home and paste a link to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <PropertyList
        properties={properties}
        activePropertyId={activePropertyId}
        onSelect={setActivePropertyId}
        onStatusUpdate={onStatusUpdate}
      />
      <div className="flex-1 overflow-y-auto" style={{ background: '#FAF8FF' }}>
        {activeProperty ? (
          <PropertyDetail
            property={activeProperty}
            onDelete={() => onDelete(activeProperty.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: '#9DA3B8' }}>
            Select a property from the list
          </div>
        )}
      </div>
    </div>
  );
}
