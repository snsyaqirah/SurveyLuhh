import type { Property, PropertyStatus, ScrapeRequest, ScrapeResponse, Session } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function checkHealth(): Promise<boolean> {
  const controller = new AbortController();
  // 12s timeout — Render cold starts can take 10-15s for the first response
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

export async function createSession(): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/api/sessions`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

export async function scrapeProperty(data: ScrapeRequest): Promise<ScrapeResponse> {
  const res = await fetch(`${API_BASE}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Scraping failed');
  }
  return res.json();
}

export async function deleteProperty(sessionId: string, propertyId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/sessions/${sessionId}/properties/${propertyId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Failed to delete property');
}

export async function updatePropertyStatus(
  sessionId: string,
  propertyId: string,
  status: PropertyStatus,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/sessions/${sessionId}/properties/${propertyId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error('Failed to update status');
}

export async function registerMember(sessionId: string, nickname: string): Promise<{ memberToken?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    if (res.ok) return res.json();
  } catch {}
  return {};
}

export async function saveBracketResult(
  sessionId: string,
  nickname: string,
  winnerId: string,
  memberToken?: string,
): Promise<void> {
  await fetch(`${API_BASE}/api/sessions/${sessionId}/bracket`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, winnerId, memberToken }),
  }).catch(() => {});
}

export { type Property };
