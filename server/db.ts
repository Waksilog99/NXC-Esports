import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

let _db: any;

export function getDb() {
    if (_db) return _db;

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error(' [DB DIAG] DATABASE_URL is missing!');
        return null;
    }

    try {
        console.log(` [DB DIAG] Initializing connection to: ${dbUrl.split('@')[1]}`); // Log host safely
        const queryClient = postgres(dbUrl, {
            ssl: { rejectUnauthorized: false },
            connect_timeout: 5,
            max: 1,
            idle_timeout: 20,
            prepare: false,
            onnotice: () => { }
        });
        _db = drizzlePg(queryClient, { schema });
        return _db;
    } catch (err: any) {
        console.error(' [DB DIAG] Initialization failed:', err.message);
        return null;
    }
}

// Keep the export for backward compatibility but mark it as lazy
export const db = new Proxy({} as any, {
    get(_, prop) {
        const d = getDb();
        if (!d) throw new Error("Database not initialized");
        return d[prop];
    }
});
