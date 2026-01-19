import { config as dotenvConfig } from 'dotenv';
import type { Config } from './types.js';

// Load environment variables
dotenvConfig();

export const config: Config = {
  database: {
    type: (process.env.DB_TYPE as 'sqlite' | 'supabase') || 'sqlite',
    sqlitePath: process.env.SQLITE_PATH || './data/prox.db',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER as 'resend' | 'console') || 'console',
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'deals@joinprox.com',
  },
  brand: {
    primary: '#0FB872',
    dark: '#0A4D3C',
    background: '#F4FBF8',
    name: 'Prox',
  },
};

// Validation
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.database.type === 'supabase') {
    if (!config.database.supabaseUrl) {
      errors.push('SUPABASE_URL is required when using Supabase');
    }
    if (!config.database.supabaseKey) {
      errors.push('SUPABASE_ANON_KEY is required when using Supabase');
    }
  }

  if (config.email.provider === 'resend' && !config.email.resendApiKey) {
    errors.push('RESEND_API_KEY is required when using Resend');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default config;
