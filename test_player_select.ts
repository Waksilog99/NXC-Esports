
import { db } from './server/db';
import { players } from './server/schema';
import { eq } from 'drizzle-orm';

async function testQuery() {
    try {
        const allPlayers = await db.select().from(players).all();
        const p17 = allPlayers.find(p => p.id === 17);
        console.log('Player 17 from db.select().from(players):', JSON.stringify(p17, null, 2));
    } catch (e) {
        console.error('Query failed:', e);
    }
}

testQuery();
