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
    // No fallback to SQLite allowed anymore per "disable local" instruction
    throw new Error('DATABASE_URL is not set. Local SQLite is disabled.');
}

const queryClient = postgres(process.env.DATABASE_URL, {
    ssl: 'require'
});
db = drizzlePg(queryClient, { schema });

export { db };
