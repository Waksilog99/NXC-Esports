
import { db } from '../server/db';
import { users, achievements, events, sponsors, teams, players } from '../server/schema';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const runMigrations = () => {
    try {
        const sqlite = new Database('local.db');
        console.log("Running migrations...");

        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                fullname TEXT NOT NULL,
                google_id TEXT UNIQUE,
                avatar TEXT,
                role TEXT DEFAULT 'member',
                bio TEXT,
                games_played TEXT,
                achievements TEXT,
                birthday TEXT,
                created_at INTEGER DEFAULT (unixepoch()),
                ign TEXT
            )
        `).run();

        try { sqlite.prepare("ALTER TABLE users ADD COLUMN ign TEXT").run(); } catch (e) { }

        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT,
                placement TEXT
            )
        `).run();

        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                location TEXT,
                description TEXT,
                status TEXT DEFAULT 'upcoming',
                image TEXT
            )
        `).run();

        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS sponsors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                tier TEXT NOT NULL,
                logo TEXT NOT NULL,
                description TEXT,
                website TEXT
            )
        `).run();

        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                game TEXT NOT NULL,
                logo TEXT,
                description TEXT
            )
        `).run();

        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER REFERENCES teams(id),
                user_id INTEGER REFERENCES users(id),
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                kda TEXT,
                win_rate TEXT,
                image TEXT,
                is_active INTEGER DEFAULT 1
            )
        `).run();

        try { sqlite.prepare("ALTER TABLE players ADD COLUMN user_id INTEGER").run(); } catch (e) { }

        sqlite.close();
        console.log("Migrations complete.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
};

const seed = async () => {
    console.log("Starting seed...");
    runMigrations();

    // 1. Achievements
    const existingAchievements = await db.select().from(achievements).all();
    if (existingAchievements.length === 0) {
        console.log("Seeding achievements...");
        await db.insert(achievements).values([
            { title: 'PCS Spring Champion', date: '2023-04-15', description: 'Dominated the regionals with a 3-0 sweep.', placement: '1st Place' },
            { title: 'World Championship', date: '2023-11-20', description: 'Top 4 finish against international giants.', placement: 'Semi-Finalist' }
        ]);
    }

    // 2. Events
    const existingEvents = await db.select().from(events).all();
    if (existingEvents.length === 0) {
        console.log("Seeding events...");
        await db.insert(events).values([
            { title: 'Nexus Community Cup', date: '2024-06-10', location: 'Online', description: 'Open tournament for all ranks.', status: 'upcoming' },
            { title: 'Summer Split Finals', date: '2024-08-25', location: 'Seoul, KR', description: 'Watch party at HQ.', status: 'upcoming' }
        ]);
    }

    // 3. Sponsors
    const existingSponsors = await db.select().from(sponsors).all();
    if (existingSponsors.length === 0) {
        console.log("Seeding sponsors...");
        await db.insert(sponsors).values([
            { name: 'TechCore', tier: 'Platinum', logo: 'https://placehold.co/200x100?text=TechCore', description: 'High-performance gaming rigs.', website: '#' },
            { name: 'EnergyX', tier: 'Gold', logo: 'https://placehold.co/200x100?text=EnergyX', description: 'The fuel for champions.', website: '#' }
        ]);
    }

    // 4. Teams & Players
    const existingTeams = await db.select().from(teams).all();

    // Helper to create or get user for player
    const ensureUserForPlayer = async (username: string, ign: string, avatar: string) => {
        let user = await db.select().from(users).where(eq(users.username, username)).get();
        if (!user) {
            console.log(`Creating user for ${ign}...`);
            user = await db.insert(users).values({
                username: username,
                password: hashPassword('password123'),
                email: `${username}@novanexus.io`,
                fullname: ign, // Use IGN as name for simplicity in seed
                ign: ign, // Set IGN
                avatar: avatar,
                role: 'member'
            }).returning().get();
        }
        return user;
    };

    if (existingTeams.length === 0) {
        console.log("Seeding teams...");

        // Valorant Team
        const valorantTeam = await db.insert(teams).values({
            name: 'Valorant Alpha',
            game: 'Valorant',
            description: 'Our premier tactical shooter squad.'
        }).returning().get();

        if (valorantTeam) {
            const p1 = await ensureUserForPlayer('xenon_val', 'Xenon', 'https://ui-avatars.com/api/?name=Xenon&background=random');
            const p2 = await ensureUserForPlayer('aura_val', 'Aura', 'https://ui-avatars.com/api/?name=Aura&background=random');
            const p3 = await ensureUserForPlayer('cipher_val', 'Cipher', 'https://ui-avatars.com/api/?name=Cipher&background=random');
            const p4 = await ensureUserForPlayer('ghost_val', 'Ghost', 'https://ui-avatars.com/api/?name=Ghost&background=random');
            const p5 = await ensureUserForPlayer('phantom_val', 'Phantom', 'https://ui-avatars.com/api/?name=Phantom&background=random');

            await db.insert(players).values([
                { teamId: valorantTeam.id, userId: p1.id, name: 'Xenon', role: 'Duelist', kda: '2.4', winRate: '78%', image: p1.avatar },
                { teamId: valorantTeam.id, userId: p2.id, name: 'Aura', role: 'Initiator', kda: '1.9', winRate: '82%', image: p2.avatar },
                { teamId: valorantTeam.id, userId: p3.id, name: 'Cipher', role: 'Sentinel', kda: '3.1', winRate: '65%', image: p3.avatar },
                { teamId: valorantTeam.id, userId: p4.id, name: 'Ghost', role: 'Controller', kda: '1.5', winRate: '72%', image: p4.avatar },
                { teamId: valorantTeam.id, userId: p5.id, name: 'Phantom', role: 'Flex', kda: '2.1', winRate: '70%', image: p5.avatar }
            ]);
        }
    } else {
        console.log("Teams already exist, checking/adding additional teams...");

        // Check for Dota 2 Team
        const dotaTeamExists = await db.select().from(teams).where(eq(teams.name, 'Dota 2 Omega')).get();
        if (!dotaTeamExists) {
            console.log("Seeding Dota 2 team...");
            const dotaTeam = await db.insert(teams).values({
                name: 'Dota 2 Omega',
                game: 'Dota 2',
                description: 'The ancient guardians of our legacy.'
            }).returning().get();

            if (dotaTeam) {
                const p1 = await ensureUserForPlayer('miracle_dota', 'Miracle', 'https://ui-avatars.com/api/?name=Miracle&background=random');
                const p2 = await ensureUserForPlayer('sumail_dota', 'Sumail', 'https://ui-avatars.com/api/?name=Sumail&background=random');
                const p3 = await ensureUserForPlayer('collapse_dota', 'Collapse', 'https://ui-avatars.com/api/?name=Collapse&background=random');
                const p4 = await ensureUserForPlayer('yatoro_dota', 'Yatoro', 'https://ui-avatars.com/api/?name=Yatoro&background=random');
                const p5 = await ensureUserForPlayer('puppey_dota', 'Puppey', 'https://ui-avatars.com/api/?name=Puppey&background=random');

                await db.insert(players).values([
                    { teamId: dotaTeam.id, userId: p1.id, name: 'Miracle', role: 'Carry', kda: '4.5', winRate: '68%', image: p1.avatar },
                    { teamId: dotaTeam.id, userId: p2.id, name: 'Sumail', role: 'Mid', kda: '3.8', winRate: '70%', image: p2.avatar },
                    { teamId: dotaTeam.id, userId: p3.id, name: 'Collapse', role: 'Offlane', kda: '2.9', winRate: '65%', image: p3.avatar },
                    { teamId: dotaTeam.id, userId: p4.id, name: 'Yatoro', role: 'Support', kda: '1.2', winRate: '75%', image: p4.avatar },
                    { teamId: dotaTeam.id, userId: p5.id, name: 'Puppey', role: 'Hard Support', kda: '1.5', winRate: '60%', image: p5.avatar }
                ]);
            }
        }

        // Check for CS:GO Team
        const csgoTeamExists = await db.select().from(teams).where(eq(teams.name, 'CS:GO Delta')).get();
        if (!csgoTeamExists) {
            console.log("Seeding CS:GO team...");
            const csgoTeam = await db.insert(teams).values({
                name: 'CS:GO Delta',
                game: 'CS:GO',
                description: 'Precision and tactics defined.'
            }).returning().get();

            if (csgoTeam) {
                const p1 = await ensureUserForPlayer('s1mple_cs', 'S1mple', 'https://ui-avatars.com/api/?name=S1mple&background=random');
                const p2 = await ensureUserForPlayer('niko_cs', 'Niko', 'https://ui-avatars.com/api/?name=Niko&background=random');
                const p3 = await ensureUserForPlayer('zywoo_cs', 'Zywoo', 'https://ui-avatars.com/api/?name=Zywoo&background=random');
                const p4 = await ensureUserForPlayer('ropz_cs', 'Ropz', 'https://ui-avatars.com/api/?name=Ropz&background=random');
                const p5 = await ensureUserForPlayer('karrigan_cs', 'Karrigan', 'https://ui-avatars.com/api/?name=Karrigan&background=random');

                await db.insert(players).values([
                    { teamId: csgoTeam.id, userId: p1.id, name: 'S1mple', role: 'AWPer', kda: '1.8', winRate: '74%', image: p1.avatar },
                    { teamId: csgoTeam.id, userId: p2.id, name: 'Niko', role: 'Rifler', kda: '1.5', winRate: '69%', image: p2.avatar },
                    { teamId: csgoTeam.id, userId: p3.id, name: 'Zywoo', role: 'Sniper', kda: '1.7', winRate: '71%', image: p3.avatar },
                    { teamId: csgoTeam.id, userId: p4.id, name: 'Ropz', role: 'Lurker', kda: '1.4', winRate: '66%', image: p4.avatar },
                    { teamId: csgoTeam.id, userId: p5.id, name: 'Karrigan', role: 'IGL', kda: '0.9', winRate: '55%', image: p5.avatar }
                ]);
            }
        }
    }

    console.log("Seeding complete!");
};

seed().catch(console.error);
