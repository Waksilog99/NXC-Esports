import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../server/schema';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
}

const main = async () => {
    console.log('Connecting to database...');
    const client = postgres(DATABASE_URL);
    const db = drizzle(client, { schema });

    try {
        console.log('Clearing all data...');
        // Order matters for foreign keys
        await db.delete(schema.playerQuotaProgress);
        await db.delete(schema.rosterQuotas);
        await db.delete(schema.weeklyReports);
        await db.delete(schema.tournamentPlayerStats);
        await db.delete(schema.tournamentNotifications);
        await db.delete(schema.tournaments);
        await db.delete(schema.scrimNotifications);
        await db.delete(schema.eventNotifications);
        await db.delete(schema.scrimPlayerStats);
        await db.delete(schema.scrims);
        await db.delete(schema.players);
        await db.delete(schema.teams);
        await db.delete(schema.sponsors);
        await db.delete(schema.events);
        await db.delete(schema.achievements);
        await db.delete(schema.users);

        console.log('Seeding Admin and CEO accounts...');
        const hashedPassword = await bcrypt.hash('WC_Citadel_2025!', 12);

        await db.insert(schema.users).values([
            {
                username: 'admin',
                email: 'admin@waks.com',
                password: hashedPassword,
                fullname: 'Citadel Administrator',
                role: 'admin',
                createdAt: new Date()
            },
            {
                username: 'ceo',
                email: 'ceo@nxc.com',
                password: hashedPassword,
                fullname: 'WC CEO',
                role: 'ceo',
                createdAt: new Date()
            }
        ]);

        console.log('Database reset and seed complete!');
        console.log('Username: admin | Password: WC_Citadel_2025!');
        console.log('Username: ceo   | Password: WC_Citadel_2025!');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await client.end();
    }
};

main();
