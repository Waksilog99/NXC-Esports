import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db.js';
import { teams, players, scrims, scrimPlayerStats, users, playerQuotaProgress } from '../server/schema.js';
import { eq, like, inArray, sql } from 'drizzle-orm';

async function purge() {
    console.log('\n--- [PRURGE] STARTING TARGETED DATA REMOVAL ---');

    try {
        // 1. Find all "WC " teams (created by massive seed)
        const seededTeams = await db.select({ id: teams.id }).from(teams).where(like(teams.name, 'WC %'));
        const teamIds = seededTeams.map(t => t.id);

        if (teamIds.length === 0) {
            console.log('[INFO] No seeded teams starting with "WC " found. Checking for seeded users...');
        } else {
            console.log(`[INFO] Found ${teamIds.length} seeded teams.`);

            // 2. Clear Scrim Stats related to these teams
            const seededScrims = await db.select({ id: scrims.id }).from(scrims).where(inArray(scrims.teamId, teamIds));
            const scrimIds = seededScrims.map(s => s.id);

            if (scrimIds.length > 0) {
                console.log(`[INFO] Removing stats for ${scrimIds.length} scrims...`);
                await db.delete(scrimPlayerStats).where(inArray(scrimPlayerStats.scrimId, scrimIds));
                await db.delete(scrims).where(inArray(scrims.id, scrimIds));
            }

            // 3. Clear Players related to these teams
            const seededPlayers = await db.select({ id: players.id }).from(players).where(inArray(players.teamId, teamIds));
            const playerIds = seededPlayers.map(p => p.id);

            if (playerIds.length > 0) {
                console.log(`[INFO] Removing progress/records for ${playerIds.length} players...`);
                await db.delete(playerQuotaProgress).where(inArray(playerQuotaProgress.playerId, playerIds));
                await db.delete(players).where(inArray(players.id, playerIds));
            }

            // 4. Delete the Teams themselves
            console.log(`[INFO] Deleting teams...`);
            await db.delete(teams).where(inArray(teams.id, teamIds));
        }

        // 5. Clean up seeded users (mass seed uses @waks.com emails)
        const seededUsers = await db.select({ id: users.id }).from(users).where(like(users.email, '%@waks.com'));
        if (seededUsers.length > 0) {
            const userIds = seededUsers.map(u => u.id);
            console.log(`[INFO] Removing ${userIds.length} seeded user accounts...`);
            await db.delete(users).where(inArray(users.id, userIds));
        }

        console.log('\n--- [PURGE] DATABASE CLEANUP COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('\n[FATAL] Purge failed:', error);
        process.exit(1);
    }
}

purge();
