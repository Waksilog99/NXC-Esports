import dotenv from 'dotenv';
dotenv.config();
import { db } from './server/db.js';
import { scrims, tournaments } from './server/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Fetching scrims...");
    const s = await db.select().from(scrims);
    console.log("Scrim dates:", s.map(x => x.date));
    console.log("Fetching tournaments...");
    const t = await db.select().from(tournaments);
    console.log("Tournament dates:", t.map(x => x.date));
    process.exit(0);
}
main().catch(console.error);
