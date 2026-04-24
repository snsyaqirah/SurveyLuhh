export interface PropertyDetails {
  sqft: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
}

export interface PropertyAgent {
  name: string;
  phone: string;
}

export type PropertyStatus = 'none' | 'shortlisted' | 'rejected';

export interface Property {
  id: string;
  url: string;
  title: string;
  price: string;
  images: string[];
  details: PropertyDetails;
  facilities: string[];
  nearbyPlaces: string[];
  agent: PropertyAgent;
  description?: string;
  status: PropertyStatus;
  source?: string;
  addedAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  properties: Property[];
}

export interface ScrapeRequest {
  url: string;
  sessionId: string;
  recaptchaToken: string;
}

export interface ScrapeResponse {
  success: boolean;
  property?: Property;
  error?: string;
}

export interface BracketMatch {
  id: string;
  leftId: string | null;
  rightId: string | null;
  winnerId: string | null;
}

export type BracketRounds = BracketMatch[][];
