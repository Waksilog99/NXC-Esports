import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

// Default to SQLite for local development
let db: any;

if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzleNeon(sql, { schema });
} else {
    // Falls back to SQLite for local development
    const sqlite = new Database('local.db');
    db = drizzle(sqlite, { schema });
}

export { db };
