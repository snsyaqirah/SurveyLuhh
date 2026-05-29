'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import NavBar from '@/components/hunt/NavBar';
import HomeTab from '@/components/hunt/HomeTab';
import PropertiesTab from '@/components/hunt/PropertiesTab';
import InsightTab from '@/components/hunt/InsightTab';
import NicknameModal from '@/components/hunt/NicknameModal';
import ExtendBanner from '@/components/hunt/ExtendBanner';
import { getSession, updatePropertyStatus as apiUpdateStatus, deleteProperty as apiDeleteProperty, registerMember } from '@/lib/api';
import type { Property, Member, BracketResult } from '@/lib/types';

export type TabId = 'home' | 'properties' | 'insight';

const nicknameKey = (sessionId: string) => `surveyluhh_nickname_${sessionId}`;
const memberTokenKey = (sessionId: string) => `surveyluhh_member_token_${sessionId}`;

export default function HuntPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [properties, setProperties] = useState<Property[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bracketResults, setBracketResults] = useState<BracketResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [extensionCount, setExtensionCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(nicknameKey(sessionId));
    if (saved) {
      setNickname(saved);
      registerMember(sessionId, saved).then(result => {
        if (result.memberToken) {
          localStorage.setItem(memberTokenKey(sessionId), result.memberToken);
          setMemberToken(result.memberToken);
        }
      });
    } else {
      setShowNicknameModal(true);
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    try {
      const session = await getSession(sessionId);
      setProperties(session.properties);
      setMembers(session.members ?? []);
      setBracketResults(session.bracketResults ?? []);
      setSessionCreatedAt(session.createdAt);
      if (session.expiresAt) setSessionExpiresAt(session.expiresAt);
      if (session.extensionCount !== undefined) setExtensionCount(session.extensionCount);
    } catch {
      // Session not found — start fresh
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll members + bracketResults every 30s so friends' activity shows up
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const session = await getSession(sessionId);
        setMembers(session.members ?? []);
        setBracketResults(session.bracketResults ?? []);
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [sessionId]);

  const handleNicknameConfirm = (name: string) => {
    localStorage.setItem(nicknameKey(sessionId), name);
    setNickname(name);
    setShowNicknameModal(false);
    registerMember(sessionId, name).then(result => {
      if (result.memberToken) {
        localStorage.setItem(memberTokenKey(sessionId), result.memberToken);
        setMemberToken(result.memberToken);
      }
    });
  };

  const handleTabChange = useCallback(async (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'insight') {
      try {
        const session = await getSession(sessionId);
        setMembers(session.members ?? []);
        setBracketResults(session.bracketResults ?? []);
      } catch { /* silent */ }
    }
  }, [sessionId]);

  const addProperty = (property: Property) => {
    setProperties(prev => [...prev, property]);
    setActiveTab('properties');
  };

  const handleDelete = async (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    try {
      await apiDeleteProperty(sessionId, propertyId);
    } catch { /* silent */ }
  };

  const handleStatusUpdate = async (propertyId: string, status: Property['status']) => {
    setProperties(prev =>
      prev.map(p => p.id === propertyId ? { ...p, status } : p),
    );
    try {
      await apiUpdateStatus(sessionId, propertyId, status);
    } catch { /* silent */ }
  };

  const handleBracketResult = (winnerId: string) => {
    if (!nickname) return;
    setBracketResults(prev => [
      ...prev.filter(r => r.nickname !== nickname),
      { nickname, winnerId },
    ]);
  };

  return (
    <div id="app-shell" className="flex flex-col h-screen overflow-hidden" style={{ background: '#FAF8FF' }}>
      {showNicknameModal && (
        <NicknameModal
          onConfirm={handleNicknameConfirm}
          existingMembers={[...new Set(members.map(m => m.nickname))]}
        />
      )}
      <NavBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sessionId={sessionId}
        propertyCount={properties.length}
        members={members}
        nickname={nickname}
        sessionExpiresAt={sessionExpiresAt ?? (sessionCreatedAt ? new Date(new Date(sessionCreatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null)}
      />
      {sessionExpiresAt && (
        <ExtendBanner
          sessionId={sessionId}
          expiresAt={sessionExpiresAt}
          extensionCount={extensionCount}
          onExtended={(newExpiresAt, newCount) => {
            setSessionExpiresAt(newExpiresAt);
            setExtensionCount(newCount);
          }}
        />
      )}
      <main id="app-main" className="flex-1 overflow-hidden">
        {activeTab === 'home' && (
          <HomeTab sessionId={sessionId} nickname={nickname ?? ''} onPropertyAdded={addProperty} />
        )}
        {activeTab === 'properties' && (
          <PropertiesTab
            properties={properties}
            sessionId={sessionId}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDelete}
            loading={loading}
          />
        )}
        {activeTab === 'insight' && (
          <InsightTab
            properties={properties}
            sessionId={sessionId}
            nickname={nickname ?? ''}
            memberToken={memberToken ?? undefined}
            bracketResults={bracketResults}
            onBracketResult={handleBracketResult}
          />
        )}
      </main>
    </div>
  );
}
