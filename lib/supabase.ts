import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.\n' +
    'Required variables:\n' +
    '- NEXT_PUBLIC_SUPABASE_URL\n' +
    '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our API Keys table
export interface ApiKeyDB {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  environment: 'Production' | 'Development' | 'Staging' | 'Testing';
  status: 'Active' | 'Inactive' | 'Revoked' | 'Expired';
  permissions: string[];
}

