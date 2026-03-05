import dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db.js';
import { teams, users } from '../server/schema.js';
import { sql } from 'drizzle-orm';

async function peek() {
    console.log('\n--- [PEEK] SCANNING DATABASE FOR SEED PATTERNS ---');
    try {
        const allTeams = await db.select().from(teams);
        console.log(`Total Teams: ${allTeams.length}`);
        allTeams.forEach(t => console.log(` - [ID ${t.id}] ${t.name} (${t.game})`));

        const allUsers = await db.select({ id: users.id, username: users.username, email: users.email }).from(users);
        console.log(`\nTotal Users: ${allUsers.length}`);
        allUsers.forEach(u => console.log(` - [ID ${u.id}] ${u.username} | ${u.email}`));

        process.exit(0);
    } catch (error) {
        console.error('Peek failed:', error);
        process.exit(1);
    }
}

peek();
