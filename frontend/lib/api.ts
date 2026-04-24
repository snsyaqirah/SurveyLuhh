import type { Property, PropertyStatus, ScrapeRequest, ScrapeResponse, Session } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

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

export { type Property };
