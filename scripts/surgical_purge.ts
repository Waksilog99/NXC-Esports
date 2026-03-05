import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db.js';
import * as schema from '../server/schema.js';
import { eq, like, inArray, or, sql } from 'drizzle-orm';

const SEEDED_OPPONENTS = [
    'Sentinels Acad', '100T Next', 'NRG Prodigy', 'C9 White', 'TSM FTX',
    'T1 Acad', 'Gen.G Black', 'PRX Acad', 'DRX Vision', 'ZETA Div',
    'Team Secret', 'Global Esports', 'Rex Regum Qeon', 'Talon Esports',
    'DetonatioN FocusMe', 'Bleed Esports', 'Paper Rex Acad',
    'LOUD', 'Leviatan', 'KRU Esports', 'FURIA', 'MIBR',
    'Cloud9', '100 Thieves', 'Evil Geniuses', 'NRG', 'Sentinels'
];

const SEEDED_TOURNAMENTS = [
    'VCT Challengers Open Qualifier', 'Community Cup Series', 'Riot Ignis Weekly',
    'Valorant Prime Clash', 'Elite Squad Brawl', 'Red Bull Community Clutch',
    'Red Bull Campus Clutch', 'GZG Championship', 'Astra Cup', 'Spike Drop League', 'NXC Invitational',
    'Pacific Ascension', 'Challengers League', 'Ignition Series', 'First Strike',
    'Masters Qualifier', 'Champion Draft', 'Red Bull Home Ground',
    'VALORANT Regional', 'Esports Open', 'GosuGamer Cup',
    'Americas Kickoff', 'Masters Madrid', 'Stage 1 Americas', 'Masters Shanghai',
    'Stage 2 Americas', 'Champions 2026', 'LCQ Americas', 'Offseason Invitational',
    'Pan-Am Clash', 'Global Esports Tour'
];

const SEEDED_ACHIEVEMENTS = ['PCS Spring Champion', 'World Championship'];
const SEEDED_EVENTS = ['Waks Community Cup', 'Summer Split Finals'];
const SEEDED_SPONSORS = ['TechCore', 'EnergyX'];

async function surgicalPurge() {
    console.log('\n--- [PRURGE] STARTING SURGICAL DATA REMOVAL (WITH DEPENDENCY HANDLING) ---');

    try {
        // 1. Identify Seeded Users (Domain: @waks.com)
        console.log('[1/7] Identifying seeded user accounts...');
        const seededUsers = await db.select({ id: schema.users.id }).from(schema.users).where(like(schema.users.email, '%@waks.com'));
        const userIds = seededUsers.map(u => u.id);

        if (userIds.length > 0) {
            console.log(`Found ${userIds.length} seeded users. Removing associated player records and orders...`);

            // Delete orders first (Foreign Key constraint)
            await db.delete(schema.orders).where(inArray(schema.orders.userId, userIds));
            console.log(`  > Cleaned up orders for seeded users.`);

            // Delete stats and progress for players tied to these users
            const seededPlayers = await db.select({ id: schema.players.id }).from(schema.players).where(inArray(schema.players.userId, userIds));
            const playerIds = seededPlayers.map(p => p.id);

            if (playerIds.length > 0) {
                await db.delete(schema.scrimPlayerStats).where(inArray(schema.scrimPlayerStats.playerId, playerIds));
                await db.delete(schema.tournamentPlayerStats).where(inArray(schema.tournamentPlayerStats.playerId, playerIds));
                await db.delete(schema.playerQuotaProgress).where(inArray(schema.playerQuotaProgress.playerId, playerIds));
                await db.delete(schema.players).where(inArray(schema.players.id, playerIds));
                console.log(`  > Cleaned up ${playerIds.length} players.`);
            }

            await db.delete(schema.users).where(inArray(schema.users.id, userIds));
            console.log(`  > Cleaned up ${userIds.length} users.`);
        }

        // 2. Clear Seeded Scrims
        console.log('[2/7] Cleaning up seeded scrim history...');
        const seededScrims = await db.select({ id: schema.scrims.id }).from(schema.scrims).where(
            or(
                inArray(schema.scrims.opponent, SEEDED_OPPONENTS),
                like(schema.scrims.opponent, 'Rival %')
            )
        );
        const scrimIds = seededScrims.map(s => s.id);
        if (scrimIds.length > 0) {
            await db.delete(schema.scrimPlayerStats).where(inArray(schema.scrimPlayerStats.scrimId, scrimIds));
            await db.delete(schema.scrims).where(inArray(schema.scrims.id, scrimIds));
            console.log(`  > Removed ${scrimIds.length} seeded scrims.`);
        }

        // 3. Clear Seeded Tournaments
        console.log('[3/7] Cleaning up seeded tournaments...');
        const seededTours = await db.select({ id: schema.tournaments.id }).from(schema.tournaments).where(
            or(
                inArray(schema.tournaments.name, SEEDED_TOURNAMENTS),
                like(schema.tournaments.name, 'Tournament %')
            )
        );
        const tourIds = seededTours.map(t => t.id);
        if (tourIds.length > 0) {
            await db.delete(schema.tournamentPlayerStats).where(inArray(schema.tournamentPlayerStats.tournamentId, tourIds));
            await db.delete(schema.tournaments).where(inArray(schema.tournaments.id, tourIds));
            console.log(`  > Removed ${tourIds.length} seeded tournaments.`);
        }

        // 4. Delete seeded Teams (Only those prefixed with "WC " or specifically "Valorant Alpha")
        console.log('[4/7] Cleaning up seeded team entities...');
        const teamPurge = await db.select({ id: schema.teams.id }).from(schema.teams).where(
            or(
                like(schema.teams.name, 'WC %'),
                eq(schema.teams.name, 'Valorant Alpha')
            )
        );
        const teamIds = teamPurge.map(t => t.id);
        if (teamIds.length > 0) {
            await db.delete(schema.teams).where(inArray(schema.teams.id, teamIds));
            console.log(`  > Removed ${teamIds.length} seeded teams.`);
        }

        // 5. Clean up extra seeded items (Achievements, Events, Sponsors)
        console.log('[5/7] Cleaning up auxiliary seeded data...');
        await db.delete(schema.achievements).where(inArray(schema.achievements.title, SEEDED_ACHIEVEMENTS));
        await db.delete(schema.events).where(inArray(schema.events.title, SEEDED_EVENTS));

        // Handle sponsor products dependency
        const seededSponsorRows = await db.select({ id: schema.sponsors.id }).from(schema.sponsors).where(inArray(schema.sponsors.name, SEEDED_SPONSORS));
        if (seededSponsorRows.length > 0) {
            const sponsorIds = seededSponsorRows.map(s => s.id);
            await db.delete(schema.products).where(inArray(schema.products.sponsorId, sponsorIds));
            await db.delete(schema.sponsors).where(inArray(schema.sponsors.id, sponsorIds));
            console.log(`  > Cleaned up ${seededSponsorRows.length} seeded sponsors.`);
        }

        // 6. Final check for dummy users like sponsor_admin
        const extraUsers = await db.select({ id: schema.users.id }).from(schema.users).where(
            or(
                eq(schema.users.username, 'sponsor_admin'),
                like(schema.users.username, '%_Pro_%')
            )
        );
        if (extraUsers.length > 0) {
            const xIds = extraUsers.map(u => u.id);
            await db.delete(schema.orders).where(inArray(schema.orders.userId, xIds));
            await db.delete(schema.users).where(inArray(schema.users.id, xIds));
            console.log(`  > Removed ${xIds.length} residual seeded usernames.`);
        }

        console.log('\n--- [PURGE] DATABASE CLEANUP COMPLETE ---');
        console.log('Original data including legitimate users and team entities have been preserved.');
        process.exit(0);
    } catch (error) {
        console.error('\n[FATAL] Surgical purge failed:', error);
        process.exit(1);
    }
}

surgicalPurge();
