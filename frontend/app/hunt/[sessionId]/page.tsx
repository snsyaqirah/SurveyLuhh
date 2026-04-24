'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from '@/components/hunt/NavBar';
import HomeTab from '@/components/hunt/HomeTab';
import PropertiesTab from '@/components/hunt/PropertiesTab';
import InsightTab from '@/components/hunt/InsightTab';
import { getSession, updatePropertyStatus as apiUpdateStatus, deleteProperty as apiDeleteProperty } from '@/lib/api';
import type { Property } from '@/lib/types';

export type TabId = 'home' | 'properties' | 'insight';

export default function HuntPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchSession = useCallback(async () => {
    try {
      const session = await getSession(sessionId);
      setProperties(session.properties);
    } catch {
      // Session not yet in DB — start fresh
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchSession();
    }
  }, [fetchSession]);

  const addProperty = (property: Property) => {
    setProperties(prev => [...prev, property]);
    setActiveTab('properties');
  };

  const handleDelete = async (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    try {
      await apiDeleteProperty(sessionId, propertyId);
    } catch {
      // Silently fail — local state already updated
    }
  };

  const handleStatusUpdate = async (propertyId: string, status: Property['status']) => {
    setProperties(prev =>
      prev.map(p => p.id === propertyId ? { ...p, status } : p),
    );
    try {
      await apiUpdateStatus(sessionId, propertyId, status);
    } catch {
      // Silently fail — local state already updated
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#FAF8FF' }}>
      <NavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionId={sessionId}
        propertyCount={properties.length}
      />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' && (
          <HomeTab sessionId={sessionId} onPropertyAdded={addProperty} />
        )}
        {activeTab === 'properties' && (
          <PropertiesTab
            properties={properties}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDelete}
            loading={loading}
          />
        )}
        {activeTab === 'insight' && (
          <InsightTab properties={properties} sessionId={sessionId} />
        )}
      </main>
    </div>
  );
}
