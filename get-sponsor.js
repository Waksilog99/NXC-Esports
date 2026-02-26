import dotenv from 'dotenv';
dotenv.config();
import { db } from './server/db.js';
import { users } from './server/schema.js';

async function main() {
    const allUsers = await db.select().from(users);
    const sponsors = allUsers.filter(u => u.role === 'sponsor');
    console.log("Sponsor users:");
    console.log(sponsors.map(s => ({ id: s.id, username: s.username, email: s.email, role: s.role })));
    process.exit(0);
}
main().catch(console.error);
