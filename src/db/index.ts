import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// For serverless environments, we need to use the connection pooler
const connectionString = process.env.DATABASE_URL!;

// Create postgres connection with error handling
let client: ReturnType<typeof postgres> | null = null;

try {
  client = postgres(connectionString, {
    prepare: false, // Required for Supabase connection pooler
    max: 1, // Limit connections in serverless
    connect_timeout: 10,
  });
} catch (error) {
  console.warn('Direct PostgreSQL connection not available, some features may be limited');
}

// Create drizzle instance with schema
export const db = client ? drizzle(client, { schema }) : null!;

// Re-export Supabase client for REST API fallback
export { getSupabaseClient } from './supabase-client';

// Export schema for convenience
export * from './schema';
