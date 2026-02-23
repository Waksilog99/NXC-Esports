import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

let db: any;

if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is required in production');
    }
    // Still allow local SQLite for now if NOT prod, but user said "disable local"
    // To strictly follow "disable local", I should probably force Postgres.
    // However, I'll keep the check but prioritize Postgres.
}

if (process.env.DATABASE_URL) {
    const queryClient = postgres(process.env.DATABASE_URL, {
        ssl: 'require'
    });
    db = drizzlePg(queryClient, { schema });
} else {
    // If we want to strictly disable local, we can throw here or fallback to a dummy.
    // Given the user said "disable the local we will not focus on production deployment" (likely meant "focus ON production")
    // I will force a requirement for DATABASE_URL.
    throw new Error('DATABASE_URL is not set. Local SQLite is disabled.');
}

export { db };
