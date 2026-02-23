import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

let db: any;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error(' [CRITICAL ERROR] DATABASE_URL is missing. Database operations will fail.');
} else {
    try {
        const queryClient = postgres(dbUrl, {
            ssl: { rejectUnauthorized: false },
            connect_timeout: 5, // Fail fast to handle error before Vercel 10s timeout
            max: 1,
            idle_timeout: 20,
            prepare: false, // Required for transaction mode poolers
            onnotice: () => { } // Suppress noisy notices
        });
        db = drizzlePg(queryClient, { schema });
        console.log(' [DB] Postgres connection initialized with serverless-friendly SSL settings.');
    } catch (err) {
        console.error(' [CRITICAL ERROR] Failed to initialize Postgres connection:', err);
    }
}

export { db };
