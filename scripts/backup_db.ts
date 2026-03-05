import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db.js';
import * as schema from '../server/schema.js';
import fs from 'fs';
import path from 'path';

async function backup() {
    console.log('\n--- [BACKUP] EXPORTING DATABASE TABLES TO JSON ---');
    const backupDir = path.join(process.cwd(), 'backups', `db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const tables = [
        { name: 'users', table: schema.users },
        { name: 'teams', table: schema.teams },
        { name: 'players', table: schema.players },
        { name: 'scrims', table: schema.scrims },
        { name: 'scrim_player_stats', table: schema.scrimPlayerStats },
        { name: 'tournaments', table: schema.tournaments },
        { name: 'tournament_player_stats', table: schema.tournamentPlayerStats },
        { name: 'player_quota_progress', table: schema.playerQuotaProgress },
        { name: 'roster_quotas', table: schema.rosterQuotas },
        { name: 'weekly_reports', table: schema.weeklyReports },
        { name: 'site_settings', table: schema.siteSettings }
    ];

    try {
        for (const meta of tables) {
            console.log(`Exporting ${meta.name}...`);
            const data = await db.select().from(meta.table);
            fs.writeFileSync(path.join(backupDir, `${meta.name}.json`), JSON.stringify(data, null, 2));
        }
        console.log(`\n--- [BACKUP] COMPLETED SUCCESSFULLY ---`);
        console.log(`Backup saved to: ${backupDir}`);
        process.exit(0);
    } catch (error) {
        console.error('\n[FATAL] Backup failed:', error);
        process.exit(1);
    }
}

backup();
