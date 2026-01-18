/**
 * Supabase Client Helpers
 * 
 * Provides consistent client creation for both client and server components.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton browser client
let browserClient: SupabaseClient | null = null;

// Browser client (for 'use client' components)
export function createBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

// Server client with service role (for API routes and server actions)
export function createServerClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}