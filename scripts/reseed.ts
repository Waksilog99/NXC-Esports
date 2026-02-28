import 'dotenv/config';
import { db } from '../server/db';
import { users, achievements, events, sponsors, teams, players, products, orders, scrims, scrimPlayerStats, tournaments, tournamentPlayerStats, playbookStrategies, siteSettings, rosterQuotas, playerQuotaProgress, eventNotifications, scrimNotifications, tournamentNotifications } from '../server/schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const VALORANT_AGENTS = [
    'Jett', 'Raze', 'Breach', 'Omen', 'Brimstone', 'Phoenix', 'Sage', 'Sova', 'Viper', 'Cypher',
    'Reyna', 'Killjoy', 'Skye', 'Yoru', 'Astra', 'KAY/O', 'Chamber', 'Neon', 'Fade', 'Harbor',
    'Gekko', 'Deadlock', 'Iso', 'Clove', 'Vyse'
];

const VAL_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];

const seed = async () => {
    console.log("Starting full database reseed...");

    // 1. Cleanup - Truncate all tables
    console.log("Cleaning up existing data...");
    const tables = [
        tournamentPlayerStats,
        scrimPlayerStats,
        tournamentNotifications,
        scrimNotifications,
        eventNotifications,
        playbookStrategies,
        playerQuotaProgress,
        rosterQuotas,
        orders,
        products,
        players,
        scrims,
        tournaments,
        teams,
        sponsors,
        events,
        achievements,
        users,
        siteSettings
    ];

    for (const table of tables) {
        // @ts-ignore
        await db.delete(table);
    }
    console.log("Cleanup complete.");

    // 2. Users & Roles
    console.log("Seeding users...");
    const password = hashPassword('password123');

    const adminUser = (await db.insert(users).values({
        username: 'admin',
        password,
        email: 'admin@waks.com',
        fullname: 'Waks Admin',
        role: 'admin'
    }).returning())[0];

    const ceoUser = (await db.insert(users).values({
        username: 'ceo',
        password,
        email: 'ceo@waks.com',
        fullname: 'Waks CEO',
        role: 'ceo'
    }).returning())[0];

    const managerUser = (await db.insert(users).values({
        username: 'manager',
        password,
        email: 'manager@waks.com',
        fullname: 'Waks Manager',
        role: 'manager'
    }).returning())[0];

    const coachUser = (await db.insert(users).values({
        username: 'coach',
        password,
        email: 'coach@waks.com',
        fullname: 'Waks Coach',
        role: 'coach'
    }).returning())[0];

    const sponsorUser = (await db.insert(users).values({
        username: 'sponsor',
        password,
        email: 'sponsor@waks.com',
        fullname: 'TechCore Rep',
        role: 'sponsor'
    }).returning())[0];

    // Player Users
    const playerUsers = [];
    for (let i = 1; i <= 10; i++) {
        const u = (await db.insert(users).values({
            username: `player${i}`,
            password,
            email: `player${i}@waks.com`,
            fullname: `Operative ${i}`,
            role: 'player',
            ign: `OP_${i}`
        }).returning())[0];
        playerUsers.push(u);
    }

    // 3. Site Settings
    await db.insert(siteSettings).values({
        waksQrEWallet: 'https://placehold.co/200x200?text=Waks+GCash',
        waksQrBank: 'https://placehold.co/200x200?text=Waks+Maya'
    });

    // 4. Teams
    console.log("Seeding teams...");
    const valPC = (await db.insert(teams).values({
        name: 'Valorant Alpha (PC)',
        game: 'Valorant',
        managerId: managerUser.id,
        description: 'Elite PC squad for VCT competition.'
    }).returning())[0];

    const valMobile = (await db.insert(teams).values({
        name: 'Valorant Mobile Delta',
        game: 'Valorant Mobile',
        managerId: managerUser.id,
        description: 'Emerging mobile squad for handheld dominance.'
    }).returning())[0];

    // 5. Players
    console.log("Assigning players to teams...");
    const pcPlayers = [];
    for (let i = 0; i < 5; i++) {
        const p = (await db.insert(players).values({
            teamId: valPC.id,
            userId: playerUsers[i].id,
            name: playerUsers[i].ign!,
            role: VAL_ROLES[i % 4],
            kda: '2.0',
            winRate: '75%',
            acs: '250',
            image: `https://ui-avatars.com/api/?name=${playerUsers[i].ign}&background=random`
        }).returning())[0];
        pcPlayers.push(p);
    }

    const mobilePlayers = [];
    for (let i = 5; i < 10; i++) {
        const p = (await db.insert(players).values({
            teamId: valMobile.id,
            userId: playerUsers[i].id,
            name: playerUsers[i].ign!,
            role: VAL_ROLES[i % 4],
            kda: '1.8',
            winRate: '60%',
            acs: '220',
            image: `https://ui-avatars.com/api/?name=${playerUsers[i].ign}&background=random`
        }).returning())[0];
        mobilePlayers.push(p);
    }

    // 6. Sponsors & Products
    console.log("Seeding sponsors and store...");
    const techCore = (await db.insert(sponsors).values({
        name: 'TechCore',
        tier: 'Platinum',
        logo: 'https://placehold.co/200x100?text=TechCore',
        description: 'Cutting edge hardware.',
        userId: sponsorUser.id
    }).returning())[0];

    await db.insert(products).values([
        { name: 'Waks Tactical Jersey', description: 'Official uniform.', price: 4500, stock: 50, imageUrl: 'https://placehold.co/400x400?text=Jersey' },
        { name: 'TechCore Pro Mouse', description: 'Zero lag excellence.', price: 3200, stock: 20, sponsorId: techCore.id, imageUrl: 'https://placehold.co/400x400?text=Mouse' }
    ]);

    // 7. Scrims (10 records for PC)
    console.log("Seeding 10 Scrims for PC Team...");
    const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];
    const opponents = ['Sentinels', 'LOUD', 'PRX', 'DRX', 'FNC', 'NRG', 'C9', '100T', 'GE', 'TSM'];

    for (let i = 0; i < 10; i++) {
        const map = mapsPool[i % mapsPool.length];
        const isWin = Math.random() > 0.4;
        const s = (await db.insert(scrims).values({
            teamId: valPC.id,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            opponent: opponents[i],
            format: 'BO1',
            status: 'completed',
            maps: JSON.stringify([map]),
            results: JSON.stringify([{ map: 1, mapName: map, score: isWin ? '13-7' : '8-13', isVictory: isWin }])
        }).returning())[0];

        for (const p of pcPlayers) {
            await db.insert(scrimPlayerStats).values({
                scrimId: s.id,
                playerId: p.id,
                kills: 15 + Math.floor(Math.random() * 10),
                deaths: 10 + Math.floor(Math.random() * 10),
                assists: 5 + Math.floor(Math.random() * 10),
                acs: 200 + Math.floor(Math.random() * 100),
                isWin: isWin ? 1 : 0,
                agent: VALORANT_AGENTS[Math.floor(Math.random() * VALORANT_AGENTS.length)],
                role: p.role,
                map: map
            });
        }
    }

    // 8. Tournaments (10 records for Mobile)
    console.log("Seeding 10 Tournaments for Mobile Team...");
    for (let i = 0; i < 10; i++) {
        const map = mapsPool[i % mapsPool.length];
        const isWin = Math.random() > 0.4;
        const t = (await db.insert(tournaments).values({
            teamId: valMobile.id,
            name: `Mobile Masters Week ${i + 1}`,
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            opponent: 'Global Challengers',
            format: 'BO1',
            status: 'completed',
            maps: JSON.stringify([map]),
            results: JSON.stringify([{ map: 1, mapName: map, score: isWin ? '13-5' : '10-13', isVictory: isWin }])
        }).returning())[0];

        for (const p of mobilePlayers) {
            await db.insert(tournamentPlayerStats).values({
                tournamentId: t.id,
                playerId: p.id,
                kills: 12 + Math.floor(Math.random() * 12),
                deaths: 8 + Math.floor(Math.random() * 12),
                assists: 4 + Math.floor(Math.random() * 12),
                acs: 180 + Math.floor(Math.random() * 120),
                isWin: isWin ? 1 : 0,
                agent: VALORANT_AGENTS[Math.floor(Math.random() * VALORANT_AGENTS.length)],
                role: p.role,
                map: map
            });
        }
    }

    // 9. Playbook Strategies
    console.log("Seeding playbook...");
    await db.insert(playbookStrategies).values([
        { teamId: valPC.id, title: 'Ascent A-Site Execute', map: 'Ascent', side: 'attack', priority: 'high', content: '<p>Omen smokes Heaven and Tree. Jett dashes generator.</p>' },
        { teamId: valMobile.id, title: 'Bind B-Site Default', map: 'Bind', side: 'attack', priority: 'medium', content: '<p>Play for picks in Long and Hookah. Use Brimstone smokes late.</p>' }
    ]);

    // 10. Achievements & Events
    await db.insert(achievements).values([
        { title: 'Citadel Foundation', date: '2025-01-01', description: 'Waks Corporation established dominance.' },
        { title: 'First Blood', date: '2025-02-15', description: 'Secured first regional championship.' }
    ]);

    await db.insert(events).values([
        { title: 'Waks Invitational 2026', date: '2026-05-10', location: 'Manila, PH', description: 'Major tournament at the Citadel.' },
        { title: 'Community Grind Night', date: '2026-03-20', location: 'Online', description: 'Open lobby for all recruits.' }
    ]);

    console.log("Reseed complete! All systems operational.");
    process.exit(0);
};

seed().catch((err) => {
    console.error("Reseed failed:", err);
    process.exit(1);
});
