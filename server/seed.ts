import dotenv from 'dotenv';
dotenv.config();

import { db } from './db.js';
import * as schema from './schema.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function seed() {
    console.log('\n--- [NXC] STARTING DATABASE RESET & SEEDING PROTOCOL ---');

    try {
        // 1. Define tables in reverse dependency order
        const tables = [
            { name: 'scrim_player_stats', table: schema.scrimPlayerStats },
            { name: 'tournament_player_stats', table: schema.tournamentPlayerStats },
            { name: 'scrim_notifications', table: schema.scrimNotifications },
            { name: 'tournament_notifications', table: schema.tournamentNotifications },
            { name: 'event_notifications', table: schema.eventNotifications },
            { name: 'playbook_strategies', table: schema.playbookStrategies },
            { name: 'player_quota_progress', table: schema.playerQuotaProgress },
            { name: 'roster_quotas', table: schema.rosterQuotas },
            { name: 'scrims', table: schema.scrims },
            { name: 'tournaments', table: schema.tournaments },
            { name: 'players', table: schema.players },
            { name: 'orders', table: schema.orders },
            { name: 'products', table: schema.products },
            { name: 'teams', table: schema.teams },
            { name: 'sponsors', table: schema.sponsors },
            { name: 'events', table: schema.events },
            { name: 'achievements', table: schema.achievements },
            { name: 'weekly_reports', table: schema.weeklyReports },
            { name: 'site_settings', table: schema.siteSettings },
            { name: 'users', table: schema.users }
        ];

        console.log('[RESET] purging all tactical data cache...');
        for (const meta of tables) {
            process.stdout.write(`  > Clearing ${meta.name}... `);
            await db.delete(meta.table);
            console.log('Done.');
        }

        // 2. Generate Superusers
        const adminPass = crypto.randomBytes(10).toString('hex');
        const ceoPass = crypto.randomBytes(10).toString('hex');

        const hashedAdmin = await bcrypt.hash(adminPass, 12);
        const hashedCeo = await bcrypt.hash(ceoPass, 12);

        console.log('\n[PROVISION] Initializing superuser identities...');

        // CEO
        await db.insert(schema.users).values({
            username: 'ceo',
            password: hashedCeo,
            email: 'ceo@nxc-esports.com',
            fullname: 'Chief Executive Officer',
            role: 'ceo'
        });

        // Admin
        await db.insert(schema.users).values({
            username: 'admin',
            password: hashedAdmin,
            email: 'admin@nxc-esports.com',
            fullname: 'System Administrator',
            role: 'admin'
        });

        console.log('\n--- [NXC] RESET & SEEDING COMPLETE ---');
        console.log('==================================================');
        console.log('CRITICAL: NEW ACCESS CREDENTIALS');
        console.log('==================================================');
        console.log('CEO ACCOUNT:');
        console.log(`  Username: ceo`);
        console.log(`  Password: ${ceoPass}`);
        console.log('--------------------------------------------------');
        console.log('ADMIN ACCOUNT:');
        console.log(`  Username: admin`);
        console.log(`  Password: ${adminPass}`);
        console.log('==================================================');
        console.log('ACTION REQUIRED: Record these credentials securely.');
        console.log('These will NOT be displayed again.');
        console.log('==================================================\n');

        process.exit(0);
    } catch (error) {
        console.error('\n[FATAL] Protocol failure during database reset:', error);
        process.exit(1);
    }
}

seed();
