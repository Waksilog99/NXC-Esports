
import { db } from '../server/db';
import { players, scrimPlayerStats, scrims } from '../server/schema';
import { eq, sql } from 'drizzle-orm';

async function backfillXP() {
    console.log('Starting XP Backfill...');

    // 1. Get all players
    const allPlayers = await db.select().from(players).all();
    console.log(`Found ${allPlayers.length} players.`);

    for (const player of allPlayers) {
        // 2. Count completed scrims for this player
        // We strictly want stats linked to completed scrims
        const stats = await db.select()
            .from(scrimPlayerStats)
            .leftJoin(scrims, eq(scrimPlayerStats.scrimId, scrims.id))
            .where(eq(scrimPlayerStats.playerId, player.id))
            .all();

        // Filter for only completed scrims if necessary, though stats usually only exist for completed ones in this app's flow
        // But let's be safe and check if the parent scrim is completed if possible, or just assume stats entry = participation
        const participationCount = stats.length;

        if (participationCount > 0) {
            const xpPerScrim = 20;
            const totalXP = participationCount * xpPerScrim;
            const calculatedLevel = Math.floor(totalXP / 100) + 1;
            const finalLevel = Math.min(calculatedLevel, 1000);

            console.log(`Player ${player.name}: ${participationCount} scrims -> ${totalXP} XP, Level ${finalLevel}`);

            // 3. Update Player
            await db.update(players)
                .set({
                    xp: totalXP,
                    level: finalLevel
                })
                .where(eq(players.id, player.id))
                .run();
        }
    }

    console.log('XP Backfill Complete.');
}

backfillXP().catch(console.error);
