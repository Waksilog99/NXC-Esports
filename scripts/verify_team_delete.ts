import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db.js';
import { teams, players, scrims, tournaments, scrimPlayerStats, tournamentPlayerStats, playerQuotaProgress } from '../server/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function verifyDeletion() {
    const timestamp = Date.now();
    const testName = `TEST_DELETE_${timestamp}`;
    console.log(`\n--- [VERIFY] TEAM DELETION TEST: ${testName} ---`);

    try {
        // 1. Create a Test Team
        console.log('[1/4] Creating test team...');
        const [testTeam] = await db.insert(teams).values({
            name: testName,
            game: 'Valorant',
            description: 'Temporary unit for deletion testing'
        }).returning();
        console.log(`  > Created Team ID: ${testTeam.id}`);

        // 2. Create a Test Scrim for this team
        console.log('[2/4] Creating test scrim...');
        const [testScrim] = await db.insert(scrims).values({
            teamId: testTeam.id,
            opponent: 'TEST_OPPONENT',
            date: new Date().toISOString(),
            status: 'completed',
            format: 'BO3',
            score: '13-5'
        }).returning();
        console.log(`  > Created Scrim ID: ${testScrim.id}`);

        // 3. Simulate Deletion Logic (Cascading)
        console.log('[3/4] Executing cascading deletion logic...');
        const teamId = testTeam.id;

        // Same logic as in index.ts
        const teamPlayers = await db.select({ id: players.id }).from(players).where(eq(players.teamId, teamId));
        const playerIds = teamPlayers.map(p => p.id);
        if (playerIds.length > 0) {
            await db.delete(scrimPlayerStats).where(inArray(scrimPlayerStats.playerId, playerIds));
            await db.delete(tournamentPlayerStats).where(inArray(tournamentPlayerStats.playerId, playerIds));
            await db.delete(playerQuotaProgress).where(inArray(playerQuotaProgress.playerId, playerIds));
            await db.delete(players).where(inArray(players.id, playerIds));
        }

        const teamScrims = await db.select({ id: scrims.id }).from(scrims).where(eq(scrims.teamId, teamId));
        const scrimIds = teamScrims.map(s => s.id);
        if (scrimIds.length > 0) {
            await db.delete(scrimPlayerStats).where(inArray(scrimPlayerStats.scrimId, scrimIds));
            await db.delete(scrims).where(inArray(scrims.id, scrimIds));
        }

        const teamTournaments = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.teamId, teamId));
        const tourIds = teamTournaments.map(t => t.id);
        if (tourIds.length > 0) {
            await db.delete(tournamentPlayerStats).where(inArray(tournamentPlayerStats.tournamentId, tourIds));
            await db.delete(tournaments).where(inArray(tournaments.id, tourIds));
        }

        await db.delete(teams).where(eq(teams.id, teamId));
        console.log('  > Deletion logic executed.');

        // 4. Verify Purge
        console.log('[4/4] Verifying data removal...');
        const checkTeam = await db.select().from(teams).where(eq(teams.id, teamId));
        const checkScrim = await db.select().from(scrims).where(eq(scrims.id, testScrim.id));

        if (checkTeam.length === 0 && checkScrim.length === 0) {
            console.log('\n--- [SUCCESS] TEAM AND ASSOCIATED DATA PURGED CORRECTLY ---');
        } else {
            console.error('\n--- [FAILURE] DATA REMNANTS FOUND ---');
            process.exit(1);
        }

        process.exit(0);
    } catch (error: any) {
        console.error('\n[FATAL] Verification failed:', error);
        process.exit(1);
    }
}

verifyDeletion();
