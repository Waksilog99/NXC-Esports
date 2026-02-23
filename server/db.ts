import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

let db: any;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error(' [CRITICAL ERROR] DATABASE_URL is missing. Database operations will fail.');
} else {
    try {
        const queryClient = postgres(dbUrl, {
            ssl: 'require'
        });
        db = drizzlePg(queryClient, { schema });
        console.log(' [DB] Postgres connection initialized.');
    } catch (err) {
        console.error(' [CRITICAL ERROR] Failed to initialize Postgres connection:', err);
    }
}

export { db };
