import 'dotenv/config';
import { db } from '../server/db';
import { users, achievements, events, sponsors, teams, players, products, orders, scrims, scrimPlayerStats, tournaments, tournamentPlayerStats, playbookStrategies } from '../server/schema';
import { eq, or, sql } from 'drizzle-orm';
import crypto from 'crypto';

const hashPassword = (password: string) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const seed = async () => {
    console.log("Starting seed on Supabase...");

    // 1. Achievements
    const existingAchievements = await db.select().from(achievements);
    if (existingAchievements.length === 0) {
        console.log("Seeding achievements...");
        await db.insert(achievements).values([
            { title: 'PCS Spring Champion', date: '2023-04-15', description: 'Dominated the regionals with a 3-0 sweep.', placement: '1st Place' },
            { title: 'World Championship', date: '2023-11-20', description: 'Top 4 finish against international giants.', placement: 'Semi-Finalist' }
        ]);
    }

    // 2. Events
    const existingEvents = await db.select().from(events);
    if (existingEvents.length === 0) {
        console.log("Seeding events...");
        await db.insert(events).values([
            { title: 'Waks Community Cup', date: '2024-06-10', location: 'Online', description: 'Open tournament for all ranks.', status: 'upcoming' },
            { title: 'Summer Split Finals', date: '2024-08-25', location: 'Seoul, KR', description: 'Watch party at HQ.', status: 'upcoming' }
        ]);
    }

    // 3. Sponsors
    const existingSponsors = await db.select().from(sponsors);
    if (existingSponsors.length === 0) {
        console.log("Seeding sponsors...");
        await db.insert(sponsors).values([
            { name: 'TechCore', tier: 'Platinum', logo: 'https://placehold.co/200x100?text=TechCore', description: 'High-performance gaming rigs.', website: '#' },
            { name: 'EnergyX', tier: 'Gold', logo: 'https://placehold.co/200x100?text=EnergyX', description: 'The fuel for champions.', website: '#' }
        ]);
    }

    // 4. Teams & Players
    const existingTeams = await db.select().from(teams);

    // Helper to create or get user for player
    const ensureUserForPlayer = async (username: string, ign: string, avatar: string) => {
        const email = `${username}@waks.com`;
        let user = (await db.select().from(users).where(
            or(
                eq(users.username, username),
                eq(users.email, email)
            )
        ))[0];

        if (!user) {
            console.log(`Creating user for ${ign}...`);
            user = (await db.insert(users).values({
                username: username,
                password: hashPassword('password123'),
                email: email,
                fullname: ign, // Use IGN as name for simplicity in seed
                ign: ign, // Set IGN
                avatar: avatar,
                role: 'member'
            }).returning())[0];
        }
        return user;
    };

    if (existingTeams.length === 0) {
        console.log("Seeding teams...");

        // Valorant Team
        const valorantTeam = (await db.insert(teams).values({
            name: 'Valorant Alpha',
            game: 'Valorant',
            description: 'Our premier tactical shooter squad.'
        }).returning())[0];

        if (valorantTeam) {
            const p1 = await ensureUserForPlayer('xenon_val', 'Xenon', 'https://ui-avatars.com/api/?name=Xenon&background=random');
            const p2 = await ensureUserForPlayer('aura_val', 'Aura', 'https://ui-avatars.com/api/?name=Aura&background=random');
            const p3 = await ensureUserForPlayer('cipher_val', 'Cipher', 'https://ui-avatars.com/api/?name=Cipher&background=random');
            const p4 = await ensureUserForPlayer('ghost_val', 'Ghost', 'https://ui-avatars.com/api/?name=Ghost&background=random');
            const p5 = await ensureUserForPlayer('phantom_val', 'Phantom', 'https://ui-avatars.com/api/?name=Phantom&background=random');

            await db.insert(players).values([
                { teamId: valorantTeam.id, userId: p1.id, name: 'Xenon', role: 'Duelist,player', kda: '2.4', winRate: '78%', image: p1.avatar },
                { teamId: valorantTeam.id, userId: p2.id, name: 'Aura', role: 'Initiator,player', kda: '1.9', winRate: '82%', image: p2.avatar },
                { teamId: valorantTeam.id, userId: p3.id, name: 'Cipher', role: 'Sentinel,player', kda: '3.1', winRate: '65%', image: p3.avatar },
                { teamId: valorantTeam.id, userId: p4.id, name: 'Ghost', role: 'Controller,player', kda: '1.5', winRate: '72%', image: p4.avatar },
                { teamId: valorantTeam.id, userId: p5.id, name: 'Phantom', role: 'Flex,player', kda: '2.1', winRate: '70%', image: p5.avatar }
            ]);
        }
    } else {
        console.log("Teams already exist, checking/adding additional teams...");

        // Check for Dota 2 Team
        const dotaTeamExists = (await db.select().from(teams).where(eq(teams.name, 'Dota 2 Omega')))[0];
        if (!dotaTeamExists) {
            console.log("Seeding Dota 2 team...");
            const dotaTeam = (await db.insert(teams).values({
                name: 'Dota 2 Omega',
                game: 'Dota 2',
                description: 'The ancient guardians of our legacy.'
            }).returning())[0];

            if (dotaTeam) {
                const p1 = await ensureUserForPlayer('miracle_dota', 'Miracle', 'https://ui-avatars.com/api/?name=Miracle&background=random');
                const p2 = await ensureUserForPlayer('sumail_dota', 'Sumail', 'https://ui-avatars.com/api/?name=Sumail&background=random');
                const p3 = await ensureUserForPlayer('collapse_dota', 'Collapse', 'https://ui-avatars.com/api/?name=Collapse&background=random');
                const p4 = await ensureUserForPlayer('yatoro_dota', 'Yatoro', 'https://ui-avatars.com/api/?name=Yatoro&background=random');
                const p5 = await ensureUserForPlayer('puppey_dota', 'Puppey', 'https://ui-avatars.com/api/?name=Puppey&background=random');

                await db.insert(players).values([
                    { teamId: dotaTeam.id, userId: p1.id, name: 'Miracle', role: 'Carry,player', kda: '4.5', winRate: '68%', image: p1.avatar },
                    { teamId: dotaTeam.id, userId: p2.id, name: 'Sumail', role: 'Mid,player', kda: '3.8', winRate: '70%', image: p2.avatar },
                    { teamId: dotaTeam.id, userId: p3.id, name: 'Collapse', role: 'Offlane,player', kda: '2.9', winRate: '65%', image: p3.avatar },
                    { teamId: dotaTeam.id, userId: p4.id, name: 'Yatoro', role: 'Support,player', kda: '1.2', winRate: '75%', image: p4.avatar },
                    { teamId: dotaTeam.id, userId: p5.id, name: 'Puppey', role: 'Hard Support,player', kda: '1.5', winRate: '60%', image: p5.avatar }
                ]);
            }
        }

        // Check for CS:GO Team
        const csgoTeamExists = (await db.select().from(teams).where(eq(teams.name, 'CS:GO Delta')))[0];
        if (!csgoTeamExists) {
            console.log("Seeding CS:GO team...");
            const csgoTeam = (await db.insert(teams).values({
                name: 'CS:GO Delta',
                game: 'CS:GO',
                description: 'Precision and tactics defined.'
            }).returning())[0];

            if (csgoTeam) {
                const p1 = await ensureUserForPlayer('s1mple_cs', 'S1mple', 'https://ui-avatars.com/api/?name=S1mple&background=random');
                const p2 = await ensureUserForPlayer('niko_cs', 'Niko', 'https://ui-avatars.com/api/?name=Niko&background=random');
                const p3 = await ensureUserForPlayer('zywoo_cs', 'Zywoo', 'https://ui-avatars.com/api/?name=Zywoo&background=random');
                const p4 = await ensureUserForPlayer('ropz_cs', 'Ropz', 'https://ui-avatars.com/api/?name=Ropz&background=random');
                const p5 = await ensureUserForPlayer('karrigan_cs', 'Karrigan', 'https://ui-avatars.com/api/?name=Karrigan&background=random');

                await db.insert(players).values([
                    { teamId: csgoTeam.id, userId: p1.id, name: 'S1mple', role: 'AWPer,player', kda: '1.8', winRate: '74%', image: p1.avatar },
                    { teamId: csgoTeam.id, userId: p2.id, name: 'Niko', role: 'Rifler,player', kda: '1.5', winRate: '69%', image: p2.avatar },
                    { teamId: csgoTeam.id, userId: p3.id, name: 'Zywoo', role: 'Sniper,player', kda: '1.7', winRate: '71%', image: p3.avatar },
                    { teamId: csgoTeam.id, userId: p4.id, name: 'Ropz', role: 'Lurker,player', kda: '1.4', winRate: '66%', image: p4.avatar },
                    { teamId: csgoTeam.id, userId: p5.id, name: 'Karrigan', role: 'IGL,player', kda: '0.9', winRate: '55%', image: p5.avatar }
                ]);
            }
        }
    }

    // 5. Store & E-Commerce
    let sponsorUserRows = await db.select().from(users).where(
        or(
            eq(users.username, 'sponsor_admin'),
            eq(users.email, 'sponsor@waks.com')
        )
    );
    let sponsorUser = sponsorUserRows[0];
    if (!sponsorUser) {
        console.log("Creating sponsor dummy user...");
        const newSponsors = await db.insert(users).values({
            username: 'sponsor_admin',
            password: hashPassword('password123'),
            email: 'sponsor@waks.com',
            fullname: 'Brand Rep',
            role: 'sponsor'
        }).returning();
        sponsorUser = newSponsors[0];
    }

    const existingProducts = await db.select().from(products);
    if (existingProducts.length === 0) {
        console.log("Seeding products...");
        const p1Rows = await db.insert(products).values({
            name: 'Waks Pro Jersey 2026',
            description: 'Official match jersey worn by Waks Corporation operatives. Made with sweat-wicking tactical fabric.',
            price: 5999,
            stock: 100,
            sponsorId: null,
            imageUrl: 'https://placehold.co/400x400?text=Waks+Jersey'
        }).returning();
        const p1 = p1Rows[0];

        const p2Rows = await db.insert(products).values({
            name: 'Command Setup Mousepad',
            description: 'Extended glide surface for precision aiming. Waks Corporation aesthetic.',
            price: 2499,
            stock: 0, // out of stock testing
            sponsorId: null,
            imageUrl: 'https://placehold.co/600x300?text=Waks+Mousepad'
        }).returning();

        if (sponsorUser) {
            const techCoreSponsor = (await db.select().from(sponsors).where(eq(sponsors.name, 'TechCore')))[0];
            const s1Rows = await db.insert(products).values({
                name: 'TechCore Elite Headset',
                description: 'Crystal clear comms. Tactical audio advantage provided by TechCore.',
                price: 12900,
                stock: 50,
                sponsorId: techCoreSponsor ? techCoreSponsor.id : null,
                imageUrl: 'https://placehold.co/400x400?text=TechCore+Headset'
            }).returning();
            const s1 = s1Rows[0];

            console.log("Seeding dummy orders...");
            await db.insert(orders).values([
                {
                    userId: sponsorUser.id,
                    productId: p1.id,
                    recipientName: 'Test Buyer',
                    deliveryAddress: '123 Waks HQ, Metro Manila',
                    contactNumber: '09123456789',
                    paymentMethod: 'E-Wallet',
                    status: 'Pending'
                },
                {
                    userId: sponsorUser.id,
                    productId: s1.id,
                    recipientName: 'Elite Operative',
                    deliveryAddress: 'Secret Base, 404',
                    contactNumber: '09000000000',
                    paymentMethod: 'Card',
                    status: 'Completed'
                }
            ]);
        }
    }

    // 6. Scrims, Tournaments & Playbook
    const valTeam = (await db.select().from(teams).where(eq(teams.name, 'Valorant Alpha')))[0];
    if (valTeam) {
        const valPlayers = await db.select().from(players).where(eq(players.teamId, valTeam.id));

        // Playbook
        const existingStrats = await db.select().from(playbookStrategies).where(eq(playbookStrategies.teamId, valTeam.id));
        if (existingStrats.length === 0) {
            console.log("Seeding Playbook Strategies...");
            await db.insert(playbookStrategies).values([
                { teamId: valTeam.id, title: 'Ascent A Split Execute', map: 'Ascent', side: 'Attack', category: 'Execute', content: '# Operation Details\n- **Omen:** Smokes A Heaven and Tree\n- **Sova:** Recon dart back site\n- **Jett:** Dash entry into Gen\n- **Kayo:** Knife close right to clear Sentinel traps.' },
                { teamId: valTeam.id, title: 'Bind B Long Lurk', map: 'Bind', side: 'Neutral', category: 'Default', content: '# Setup\nTake B long control slowly, wait for rotation info. If nothing, execute A short.' }
            ]);
        }

        // Scrims
        const existingScrims = await db.select().from(scrims).where(eq(scrims.teamId, valTeam.id));
        if (existingScrims.length < 10) {
            console.log("Seeding 10 Scrims...");
            const opponents = ['Sentinels Acad', '100T Next', 'NRG Prodigy', 'C9 White', 'TSM FTX', 'T1 Acad', 'Gen.G Black', 'PRX Acad', 'DRX Vision', 'ZETA Div'];
            const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];

            for (let i = 0; i < 10; i++) {
                const map1 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const map2 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const isWinMap1 = Math.random() > 0.5;
                const isWinMap2 = Math.random() > 0.5;

                const s = (await db.insert(scrims).values({
                    teamId: valTeam.id,
                    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    opponent: opponents[i],
                    format: 'BO3',
                    status: 'completed',
                    maps: JSON.stringify([map1, map2]),
                    results: JSON.stringify([
                        { map: 1, mapName: map1, score: isWinMap1 ? 'WIN' : 'LOSS', teamScore: isWinMap1 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap1 ? Math.floor(Math.random() * 12) : 13 },
                        { map: 2, mapName: map2, score: isWinMap2 ? 'WIN' : 'LOSS', teamScore: isWinMap2 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap2 ? Math.floor(Math.random() * 12) : 13 }
                    ])
                }).returning())[0];

                if (valPlayers.length >= 5) {
                    await db.insert(scrimPlayerStats).values([
                        { scrimId: s.id, playerId: valPlayers[0].id, kills: 20 + Math.floor(Math.random() * 30), deaths: 10 + Math.floor(Math.random() * 20), assists: Math.floor(Math.random() * 15), acs: 150 + Math.floor(Math.random() * 150), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                        { scrimId: s.id, playerId: valPlayers[1].id, kills: 15 + Math.floor(Math.random() * 25), deaths: 10 + Math.floor(Math.random() * 25), assists: 5 + Math.floor(Math.random() * 20), acs: 140 + Math.floor(Math.random() * 120), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                        { scrimId: s.id, playerId: valPlayers[2].id, kills: 10 + Math.floor(Math.random() * 20), deaths: 10 + Math.floor(Math.random() * 20), assists: 10 + Math.floor(Math.random() * 15), acs: 120 + Math.floor(Math.random() * 100), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                        { scrimId: s.id, playerId: valPlayers[3].id, kills: 12 + Math.floor(Math.random() * 22), deaths: 12 + Math.floor(Math.random() * 25), assists: Math.floor(Math.random() * 10), acs: 130 + Math.floor(Math.random() * 110), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                        { scrimId: s.id, playerId: valPlayers[4].id, kills: 15 + Math.floor(Math.random() * 20), deaths: 15 + Math.floor(Math.random() * 20), assists: Math.floor(Math.random() * 12), acs: 140 + Math.floor(Math.random() * 100), isWin: isWinMap1 || isWinMap2 ? 1 : 0 }
                    ]);
                }
            }
        }

        // Tournaments
        const existingTours = await db.select().from(tournaments).where(eq(tournaments.teamId, valTeam.id));
        if (existingTours.length < 10) {
            console.log("Seeding 10 Tournaments...");
            const tourNames = ['VCT Challengers Open Qualifier', 'Community Cup Series', 'Riot Ignis Weekly', 'Valorant Prime Clash', 'Elite Squad Brawl', 'Red Bull Campus Clutch', 'GZG Championship', 'Astra Cup', 'Spike Drop League', 'NXC Invitational'];
            const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];

            for (let i = 0; i < 10; i++) {
                const map1 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const isWinMap1 = Math.random() > 0.4;

                const t = (await db.insert(tournaments).values({
                    teamId: valTeam.id,
                    name: tourNames[i] || `Tournament ${i + 1}`,
                    date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                    opponent: 'TBA Opponent',
                    format: 'BO1',
                    status: 'completed',
                    maps: JSON.stringify([map1]),
                    results: JSON.stringify([{ map: 1, mapName: map1, score: isWinMap1 ? 'WIN' : 'LOSS', teamScore: isWinMap1 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap1 ? Math.floor(Math.random() * 12) : 13 }])
                }).returning())[0];

                if (valPlayers.length >= 5) {
                    await db.insert(tournamentPlayerStats).values([
                        { tournamentId: t.id, playerId: valPlayers[0].id, kills: 15 + Math.floor(Math.random() * 20), deaths: 5 + Math.floor(Math.random() * 15), assists: Math.floor(Math.random() * 10), acs: 180 + Math.floor(Math.random() * 150), isWin: isWinMap1 ? 1 : 0 },
                        { tournamentId: t.id, playerId: valPlayers[1].id, kills: 10 + Math.floor(Math.random() * 15), deaths: 8 + Math.floor(Math.random() * 15), assists: 5 + Math.floor(Math.random() * 15), acs: 150 + Math.floor(Math.random() * 100), isWin: isWinMap1 ? 1 : 0 },
                        { tournamentId: t.id, playerId: valPlayers[2].id, kills: 8 + Math.floor(Math.random() * 12), deaths: 10 + Math.floor(Math.random() * 12), assists: 5 + Math.floor(Math.random() * 10), acs: 130 + Math.floor(Math.random() * 80), isWin: isWinMap1 ? 1 : 0 },
                        { tournamentId: t.id, playerId: valPlayers[3].id, kills: 12 + Math.floor(Math.random() * 18), deaths: 10 + Math.floor(Math.random() * 15), assists: 2 + Math.floor(Math.random() * 8), acs: 140 + Math.floor(Math.random() * 120), isWin: isWinMap1 ? 1 : 0 },
                        { tournamentId: t.id, playerId: valPlayers[4].id, kills: 10 + Math.floor(Math.random() * 15), deaths: 12 + Math.floor(Math.random() * 15), assists: 4 + Math.floor(Math.random() * 10), acs: 140 + Math.floor(Math.random() * 90), isWin: isWinMap1 ? 1 : 0 }
                    ]);
                }
            }
        }
    }

    // 7. Seed AK Esports
    const akTeam = (await db.select().from(teams).where(eq(teams.name, 'AK Esports')))[0];
    if (akTeam) {
        console.log("Seeding AK Esports...");
        let akPlayers = await db.select().from(players).where(eq(players.teamId, akTeam.id));

        if (akPlayers.length === 0) {
            const p1 = await ensureUserForPlayer('ak_viper', 'Viper', 'https://ui-avatars.com/api/?name=Viper&background=random');
            const p2 = await ensureUserForPlayer('ak_venom', 'Venom', 'https://ui-avatars.com/api/?name=Venom&background=random');
            const p3 = await ensureUserForPlayer('ak_void', 'Void', 'https://ui-avatars.com/api/?name=Void&background=random');
            const p4 = await ensureUserForPlayer('ak_vortex', 'Vortex', 'https://ui-avatars.com/api/?name=Vortex&background=random');
            const p5 = await ensureUserForPlayer('ak_vulcan', 'Vulcan', 'https://ui-avatars.com/api/?name=Vulcan&background=random');

            akPlayers = await db.insert(players).values([
                { teamId: akTeam.id, userId: p1.id, name: 'Viper', role: 'Duelist,player', kda: '2.5', winRate: '68%', image: p1.avatar },
                { teamId: akTeam.id, userId: p2.id, name: 'Venom', role: 'Initiator,player', kda: '2.1', winRate: '70%', image: p2.avatar },
                { teamId: akTeam.id, userId: p3.id, name: 'Void', role: 'Controller,player', kda: '1.8', winRate: '65%', image: p3.avatar },
                { teamId: akTeam.id, userId: p4.id, name: 'Vortex', role: 'Sentinel,player', kda: '1.9', winRate: '66%', image: p4.avatar },
                { teamId: akTeam.id, userId: p5.id, name: 'Vulcan', role: 'Flex,player', kda: '2.0', winRate: '67%', image: p5.avatar }
            ]).returning();
        }

        // AK Scrims
        const existingAkScrims = await db.select().from(scrims).where(eq(scrims.teamId, akTeam.id));
        if (existingAkScrims.length < 10 && akPlayers.length >= 5) {
            console.log("Seeding 10 Scrims for AK Esports...");
            const opponents = ['Team Secret', 'Global Esports', 'Rex Regum Qeon', 'Talon Esports', 'DetonatioN FocusMe', 'Bleed Esports', 'Paper Rex Acad', 'T1 Acad', 'Gen.G Black', 'DRX Vision'];
            const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];

            for (let i = 0; i < 10; i++) {
                const map1 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const map2 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const isWinMap1 = Math.random() > 0.5;
                const isWinMap2 = Math.random() > 0.5;

                const s = (await db.insert(scrims).values({
                    teamId: akTeam.id,
                    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    opponent: opponents[i],
                    format: 'BO3',
                    status: 'completed',
                    maps: JSON.stringify([map1, map2]),
                    results: JSON.stringify([
                        { map: 1, mapName: map1, score: isWinMap1 ? 'WIN' : 'LOSS', teamScore: isWinMap1 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap1 ? Math.floor(Math.random() * 12) : 13 },
                        { map: 2, mapName: map2, score: isWinMap2 ? 'WIN' : 'LOSS', teamScore: isWinMap2 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap2 ? Math.floor(Math.random() * 12) : 13 }
                    ])
                }).returning())[0];

                await db.insert(scrimPlayerStats).values([
                    { scrimId: s.id, playerId: akPlayers[0].id, kills: 20 + Math.floor(Math.random() * 25), deaths: 10 + Math.floor(Math.random() * 20), assists: Math.floor(Math.random() * 15), acs: 180 + Math.floor(Math.random() * 100), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: akPlayers[1].id, kills: 15 + Math.floor(Math.random() * 20), deaths: 10 + Math.floor(Math.random() * 20), assists: 10 + Math.floor(Math.random() * 20), acs: 160 + Math.floor(Math.random() * 90), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: akPlayers[2].id, kills: 12 + Math.floor(Math.random() * 18), deaths: 12 + Math.floor(Math.random() * 18), assists: 10 + Math.floor(Math.random() * 15), acs: 140 + Math.floor(Math.random() * 80), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: akPlayers[3].id, kills: 14 + Math.floor(Math.random() * 15), deaths: 10 + Math.floor(Math.random() * 22), assists: 5 + Math.floor(Math.random() * 10), acs: 150 + Math.floor(Math.random() * 70), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: akPlayers[4].id, kills: 16 + Math.floor(Math.random() * 18), deaths: 15 + Math.floor(Math.random() * 18), assists: 8 + Math.floor(Math.random() * 12), acs: 160 + Math.floor(Math.random() * 80), isWin: isWinMap1 || isWinMap2 ? 1 : 0 }
                ]);
            }
        }

        // AK Tournaments
        const existingAkTours = await db.select().from(tournaments).where(eq(tournaments.teamId, akTeam.id));
        if (existingAkTours.length < 10 && akPlayers.length >= 5) {
            console.log("Seeding 10 Tournaments for AK Esports...");
            const tourNames = ['Pacific Ascension', 'Challengers League', 'Ignition Series', 'First Strike', 'Masters Qualifier', 'Champion Draft', 'Red Bull Home Ground', 'VALORANT Regional', 'Esports Open', 'GosuGamer Cup'];
            const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];

            for (let i = 0; i < 10; i++) {
                const map1 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const isWinMap1 = Math.random() > 0.4;

                const t = (await db.insert(tournaments).values({
                    teamId: akTeam.id,
                    name: tourNames[i] || `AK Tournament ${i + 1}`,
                    date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                    opponent: 'TBA Opponent',
                    format: 'BO1',
                    status: 'completed',
                    maps: JSON.stringify([map1]),
                    results: JSON.stringify([{ map: 1, mapName: map1, score: isWinMap1 ? 'WIN' : 'LOSS', teamScore: isWinMap1 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap1 ? Math.floor(Math.random() * 12) : 13 }])
                }).returning())[0];

                await db.insert(tournamentPlayerStats).values([
                    { tournamentId: t.id, playerId: akPlayers[0].id, kills: 18 + Math.floor(Math.random() * 15), deaths: 10 + Math.floor(Math.random() * 10), assists: Math.floor(Math.random() * 10), acs: 190 + Math.floor(Math.random() * 100), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: akPlayers[1].id, kills: 12 + Math.floor(Math.random() * 15), deaths: 8 + Math.floor(Math.random() * 12), assists: 5 + Math.floor(Math.random() * 15), acs: 160 + Math.floor(Math.random() * 80), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: akPlayers[2].id, kills: 10 + Math.floor(Math.random() * 12), deaths: 10 + Math.floor(Math.random() * 10), assists: 5 + Math.floor(Math.random() * 10), acs: 140 + Math.floor(Math.random() * 60), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: akPlayers[3].id, kills: 15 + Math.floor(Math.random() * 12), deaths: 12 + Math.floor(Math.random() * 10), assists: 2 + Math.floor(Math.random() * 8), acs: 150 + Math.floor(Math.random() * 90), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: akPlayers[4].id, kills: 11 + Math.floor(Math.random() * 15), deaths: 15 + Math.floor(Math.random() * 10), assists: 4 + Math.floor(Math.random() * 10), acs: 145 + Math.floor(Math.random() * 80), isWin: isWinMap1 ? 1 : 0 }
                ]);
            }
        }
    }

    // 8. Seed Olympic Gays
    const objTeam = (await db.select().from(teams).where(eq(teams.name, 'Olympic Gays')))[0];
    if (objTeam) {
        console.log("Seeding Olympic Gays...");
        let objPlayers = await db.select().from(players).where(eq(players.teamId, objTeam.id));

        if (objPlayers.length === 0) {
            const p1 = await ensureUserForPlayer('og_zeus', 'Zeus', 'https://ui-avatars.com/api/?name=Zeus&background=random');
            const p2 = await ensureUserForPlayer('og_apollo', 'Apollo', 'https://ui-avatars.com/api/?name=Apollo&background=random');
            const p3 = await ensureUserForPlayer('og_ares', 'Ares', 'https://ui-avatars.com/api/?name=Ares&background=random');
            const p4 = await ensureUserForPlayer('og_hermes', 'Hermes', 'https://ui-avatars.com/api/?name=Hermes&background=random');
            const p5 = await ensureUserForPlayer('og_hades', 'Hades', 'https://ui-avatars.com/api/?name=Hades&background=random');

            objPlayers = await db.insert(players).values([
                { teamId: objTeam.id, userId: p1.id, name: 'Zeus', role: 'Duelist,player', kda: '2.8', winRate: '75%', image: p1.avatar },
                { teamId: objTeam.id, userId: p2.id, name: 'Apollo', role: 'Initiator,player', kda: '2.4', winRate: '77%', image: p2.avatar },
                { teamId: objTeam.id, userId: p3.id, name: 'Ares', role: 'Controller,player', kda: '1.9', winRate: '70%', image: p3.avatar },
                { teamId: objTeam.id, userId: p4.id, name: 'Hermes', role: 'Sentinel,player', kda: '2.1', winRate: '72%', image: p4.avatar },
                { teamId: objTeam.id, userId: p5.id, name: 'Hades', role: 'Flex,player', kda: '2.3', winRate: '73%', image: p5.avatar }
            ]).returning();
        }

        // OG Scrims
        const existingObjScrims = await db.select().from(scrims).where(eq(scrims.teamId, objTeam.id));
        if (existingObjScrims.length < 10 && objPlayers.length >= 5) {
            console.log("Seeding 10 Scrims for Olympic Gays...");
            const opponents = ['LOUD', 'Leviatan', 'KRU Esports', 'FURIA', 'MIBR', 'Cloud9', '100 Thieves', 'Evil Geniuses', 'NRG', 'Sentinels'];
            const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];

            for (let i = 0; i < 10; i++) {
                const map1 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const map2 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const isWinMap1 = Math.random() > 0.5;
                const isWinMap2 = Math.random() > 0.5;

                const s = (await db.insert(scrims).values({
                    teamId: objTeam.id,
                    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    opponent: opponents[i],
                    format: 'BO3',
                    status: 'completed',
                    maps: JSON.stringify([map1, map2]),
                    results: JSON.stringify([
                        { map: 1, mapName: map1, score: isWinMap1 ? 'WIN' : 'LOSS', teamScore: isWinMap1 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap1 ? Math.floor(Math.random() * 12) : 13 },
                        { map: 2, mapName: map2, score: isWinMap2 ? 'WIN' : 'LOSS', teamScore: isWinMap2 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap2 ? Math.floor(Math.random() * 12) : 13 }
                    ])
                }).returning())[0];

                await db.insert(scrimPlayerStats).values([
                    { scrimId: s.id, playerId: objPlayers[0].id, kills: 22 + Math.floor(Math.random() * 25), deaths: 12 + Math.floor(Math.random() * 18), assists: Math.floor(Math.random() * 15), acs: 190 + Math.floor(Math.random() * 110), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: objPlayers[1].id, kills: 18 + Math.floor(Math.random() * 20), deaths: 11 + Math.floor(Math.random() * 18), assists: 12 + Math.floor(Math.random() * 18), acs: 170 + Math.floor(Math.random() * 100), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: objPlayers[2].id, kills: 14 + Math.floor(Math.random() * 18), deaths: 13 + Math.floor(Math.random() * 16), assists: 10 + Math.floor(Math.random() * 15), acs: 150 + Math.floor(Math.random() * 90), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: objPlayers[3].id, kills: 16 + Math.floor(Math.random() * 15), deaths: 12 + Math.floor(Math.random() * 20), assists: 8 + Math.floor(Math.random() * 10), acs: 160 + Math.floor(Math.random() * 80), isWin: isWinMap1 || isWinMap2 ? 1 : 0 },
                    { scrimId: s.id, playerId: objPlayers[4].id, kills: 18 + Math.floor(Math.random() * 18), deaths: 16 + Math.floor(Math.random() * 15), assists: 10 + Math.floor(Math.random() * 12), acs: 170 + Math.floor(Math.random() * 90), isWin: isWinMap1 || isWinMap2 ? 1 : 0 }
                ]);
            }
        }

        // OG Tournaments
        const existingObjTours = await db.select().from(tournaments).where(eq(tournaments.teamId, objTeam.id));
        if (existingObjTours.length < 10 && objPlayers.length >= 5) {
            console.log("Seeding 10 Tournaments for Olympic Gays...");
            const tourNames = ['Americas Kickoff', 'Masters Madrid', 'Stage 1 Americas', 'Masters Shanghai', 'Stage 2 Americas', 'Champions 2026', 'LCQ Americas', 'Offseason Invitational', 'Pan-Am Clash', 'Global Esports Tour'];
            const mapsPool = ['Ascent', 'Split', 'Bind', 'Haven', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];

            for (let i = 0; i < 10; i++) {
                const map1 = mapsPool[Math.floor(Math.random() * mapsPool.length)];
                const isWinMap1 = Math.random() > 0.4;

                const t = (await db.insert(tournaments).values({
                    teamId: objTeam.id,
                    name: tourNames[i] || `OG Tournament ${i + 1}`,
                    date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
                    opponent: 'TBA Opponent',
                    format: 'BO1',
                    status: 'completed',
                    maps: JSON.stringify([map1]),
                    results: JSON.stringify([{ map: 1, mapName: map1, score: isWinMap1 ? 'WIN' : 'LOSS', teamScore: isWinMap1 ? 13 : Math.floor(Math.random() * 12), opponentScore: isWinMap1 ? Math.floor(Math.random() * 12) : 13 }])
                }).returning())[0];

                await db.insert(tournamentPlayerStats).values([
                    { tournamentId: t.id, playerId: objPlayers[0].id, kills: 20 + Math.floor(Math.random() * 15), deaths: 12 + Math.floor(Math.random() * 8), assists: Math.floor(Math.random() * 8), acs: 200 + Math.floor(Math.random() * 100), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: objPlayers[1].id, kills: 14 + Math.floor(Math.random() * 15), deaths: 10 + Math.floor(Math.random() * 10), assists: 8 + Math.floor(Math.random() * 12), acs: 170 + Math.floor(Math.random() * 90), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: objPlayers[2].id, kills: 12 + Math.floor(Math.random() * 12), deaths: 12 + Math.floor(Math.random() * 8), assists: 6 + Math.floor(Math.random() * 10), acs: 150 + Math.floor(Math.random() * 70), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: objPlayers[3].id, kills: 16 + Math.floor(Math.random() * 14), deaths: 14 + Math.floor(Math.random() * 8), assists: 4 + Math.floor(Math.random() * 8), acs: 160 + Math.floor(Math.random() * 80), isWin: isWinMap1 ? 1 : 0 },
                    { tournamentId: t.id, playerId: objPlayers[4].id, kills: 14 + Math.floor(Math.random() * 14), deaths: 16 + Math.floor(Math.random() * 8), assists: 6 + Math.floor(Math.random() * 10), acs: 155 + Math.floor(Math.random() * 80), isWin: isWinMap1 ? 1 : 0 }
                ]);
            }
        }
    }

    // 9. Fix existing player roles
    console.log("Updating existing player roles...");
    await db.update(players)
        .set({ role: sql`${players.role} || ',player'` })
        .where(sql`${players.role} NOT LIKE '%,player'`);

    console.log("Seeding complete!");
};

seed().catch(console.error);
