import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

let db: any;

if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    const queryClient = postgres(process.env.DATABASE_URL, {
        ssl: 'require'
    });
    db = drizzlePg(queryClient, { schema });
} else {
    // Falls back to SQLite for local development
    const sqlite = new Database('local.db');
    db = drizzle(sqlite, { schema });
}

export { db };
