import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db.js';
import { scrims, scrimPlayerStats, players } from '../server/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function peekScrims() {
    console.log('\n--- [PEEK] SCANNING SCRIMS FOR TEAM 12 ---');
    try {
        const teamScrims = await db.select().from(scrims).where(eq(scrims.teamId, 12));
        console.log(`Total Scrims for Team 12: ${teamScrims.length}`);
        teamScrims.forEach(s => console.log(` - [ID ${s.id}] vs ${s.opponent} on ${s.date}`));

        const teamPlayers = await db.select().from(players).where(eq(players.teamId, 12));
        console.log(`\nTotal Players for Team 12: ${teamPlayers.length}`);
        teamPlayers.forEach(p => console.log(` - [ID ${p.id}] ${p.name} (User ID: ${p.userId})`));

        process.exit(0);
    } catch (error) {
        console.error('Peek failed:', error);
        process.exit(1);
    }
}

peekScrims();
