// Raw input types (from JSON)
export interface RawDeal {
  retailer: string;
  product: string;
  size: string;
  price: number;
  start: string;
  end: string;
  category: string;
}

export interface RawUser {
  name: string;
  email: string;
  preferred_retailers: string[];
}

// Database entity types
export interface Retailer {
  id: number;
  name: string;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  size: string;
  category: string;
  created_at?: string;
}

export interface Deal {
  id: number;
  retailer_id: number;
  product_id: number;
  price: number;
  start_date: string;
  end_date: string;
  created_at?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  preferred_retailers: string[];
  created_at?: string;
}

// Joined/enriched types for email generation
export interface EnrichedDeal {
  id: number;
  retailer_name: string;
  product_name: string;
  size: string;
  category: string;
  price: number;
  start_date: string;
  end_date: string;
}

export interface DealsByRetailer {
  retailer: string;
  deals: EnrichedDeal[];
}

// Email types
export interface EmailData {
  to: string;
  userName: string;
  deals: EnrichedDeal[];
  dealsByRetailer: DealsByRetailer[];
  topDeals: EnrichedDeal[];
}

// Config types
export interface Config {
  database: {
    type: 'sqlite' | 'supabase';
    sqlitePath?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
  };
  email: {
    provider: 'resend' | 'console';
    resendApiKey?: string;
    fromEmail: string;
  };
  brand: {
    primary: string;
    dark: string;
    background: string;
    name: string;
  };
}

// Ingestion result types
export interface IngestionResult {
  retailers: { inserted: number; existing: number };
  products: { inserted: number; existing: number };
  deals: { inserted: number; skipped: number };
}

export interface EmailSendResult {
  success: boolean;
  email: string;
  userName: string;
  dealsCount: number;
  error?: string;
}
