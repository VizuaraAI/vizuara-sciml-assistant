/**
 * Typed environment variable access with validation
 * Throws clear errors if required variables are missing
 */

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add it to your .env.local file. See .env.example for reference.`
    );
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

// Database
export const DATABASE_URL = getRequiredEnv('DATABASE_URL');
export const DIRECT_URL = getOptionalEnv('DIRECT_URL', DATABASE_URL);

// Claude API
export const ANTHROPIC_API_KEY = getRequiredEnv('ANTHROPIC_API_KEY');

// NextAuth
export const NEXTAUTH_SECRET = getOptionalEnv('NEXTAUTH_SECRET', 'dev-secret');
export const NEXTAUTH_URL = getOptionalEnv('NEXTAUTH_URL', 'http://localhost:3000');

// Environment checks
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Export all as a typed object for convenience
export const env = {
  DATABASE_URL,
  DIRECT_URL,
  ANTHROPIC_API_KEY,
  NEXTAUTH_SECRET,
  NEXTAUTH_URL,
  isDevelopment,
  isProduction,
} as const;
