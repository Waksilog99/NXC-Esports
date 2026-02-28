import dotenv from 'dotenv';
dotenv.config();

import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('\n--- [NXC] APPLYING MANUAL SCHEMA FIXES ---');

    try {
        console.log('[MIGRATE] Updating playbook_strategies table...');

        // Add game column
        await db.execute(sql`ALTER TABLE playbook_strategies ADD COLUMN IF NOT EXISTS game TEXT;`);
        console.log('  > Added column: game');

        // Add role column
        await db.execute(sql`ALTER TABLE playbook_strategies ADD COLUMN IF NOT EXISTS role TEXT;`);
        console.log('  > Added column: role');

        // Add video_url column
        await db.execute(sql`ALTER TABLE playbook_strategies ADD COLUMN IF NOT EXISTS video_url TEXT;`);
        console.log('  > Added column: video_url');

        // Add author_id column
        await db.execute(sql`ALTER TABLE playbook_strategies ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id);`);
        console.log('  > Added column: author_id');

        console.log('\n--- [NXC] SCHEMA MIGRATION COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('\n[FATAL] Migration failure:', error);
        process.exit(1);
    }
}

migrate();
