import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// For serverless environments, we need to use the connection pooler
const connectionString = process.env.DATABASE_URL!;

// Create postgres connection
// In production, you might want to configure pool size
const client = postgres(connectionString, {
  prepare: false, // Required for Supabase connection pooler
  max: 1, // Limit connections in serverless
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema';
