import 'dotenv/config';
import { db } from '../server/db';
import {
    users,
    achievements,
    events,
    sponsors,
    teams,
    players,
    products,
    orders,
    scrims,
    scrimPlayerStats,
    eventNotifications,
    scrimNotifications,
    tournamentNotifications,
    tournaments,
    tournamentPlayerStats,
    weeklyReports,
    rosterQuotas,
    playerQuotaProgress,
    siteSettings
} from '../server/schema';
import crypto from 'crypto';

const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const resetDB = async () => {
    console.log("Starting full database wipe...");

    try {
        // Delete in order to respect foreign key constraints
        // 1. Orders and Products
        console.log("Deleting orders...");
        await db.delete(orders);
        console.log("Deleting products...");
        await db.delete(products);

        // 2. Quotas and Reports
        console.log("Deleting player quota progress...");
        await db.delete(playerQuotaProgress);
        console.log("Deleting roster quotas...");
        await db.delete(rosterQuotas);
        console.log("Deleting weekly reports...");
        await db.delete(weeklyReports);

        // 3. Tournaments
        console.log("Deleting tournament player stats...");
        await db.delete(tournamentPlayerStats);
        console.log("Deleting tournament notifications...");
        await db.delete(tournamentNotifications);
        console.log("Deleting tournaments...");
        await db.delete(tournaments);

        // 4. Scrims
        console.log("Deleting scrim player stats...");
        await db.delete(scrimPlayerStats);
        console.log("Deleting scrim notifications...");
        await db.delete(scrimNotifications);
        console.log("Deleting scrims...");
        await db.delete(scrims);

        // 5. Events and others
        console.log("Deleting event notifications...");
        await db.delete(eventNotifications);
        console.log("Deleting events...");
        await db.delete(events);
        console.log("Deleting achievements...");
        await db.delete(achievements);
        console.log("Deleting site settings...");
        await db.delete(siteSettings);

        // 6. Players, Teams, Sponsors
        console.log("Deleting players...");
        await db.delete(players);
        console.log("Deleting teams...");
        await db.delete(teams);
        console.log("Deleting sponsors...");
        await db.delete(sponsors);

        // 7. Users
        console.log("Deleting users...");
        await db.delete(users);

        console.log("Database successfully wiped.");

        console.log("Creating default Admin and CEO accounts...");

        await db.insert(users).values([
            {
                username: 'admin',
                password: hashPassword('admin123'), // Basic default, can be changed later
                email: 'admin@waks.com',
                fullname: 'System Administrator',
                role: 'admin',
                ign: 'ADMIN',
                avatar: 'https://ui-avatars.com/api/?name=Admin&background=fbbf24&color=000'
            },
            {
                username: 'ceo',
                password: hashPassword('ceo123'),
                email: 'ceo@waks.com',
                fullname: 'Chief Executive Officer',
                role: 'ceo',
                ign: 'CEO',
                avatar: 'https://ui-avatars.com/api/?name=CEO&background=6366f1&color=fff'
            }
        ]);

        console.log("Admin and CEO accounts created successfully.");
        console.log("Reset complete.");
        process.exit(0);

    } catch (error) {
        console.error("Error during database reset:", error);
        process.exit(1);
    }
};

resetDB();
