
import { db } from '../server/db';
import { scrims, scrimPlayerStats, teams, players } from '../server/schema';
import { eq } from 'drizzle-orm';

async function seedScrims() {
    console.log('Seeding Scrims & Stats...');

    // 1. Get Team 1 (assuming it exists from previous seed)
    const team = await db.select().from(teams).limit(1).get();
    if (!team) {
        console.error('No teams found. Run the main seed script first.');
        return;
    }
    console.log(`Seeding stats for Team: ${team.name} (ID: ${team.id})`);

    // 2. Get Players
    const teamPlayers = await db.select().from(players).where(eq(players.teamId, team.id)).all();
    if (teamPlayers.length === 0) {
        console.error('No players found for this team.');
        return;
    }

    // 3. Create Scrims
    const scrimData = [
        {
            date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
            opponent: 'Team Liquid',
            format: 'BO1',
            status: 'completed',
            maps: JSON.stringify(['Ascent']),
            results: JSON.stringify([
                { map: 1, mapName: 'Ascent', score: 'WIN', image: null, results: [] }
            ])
        },
        {
            date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
            opponent: 'Sentinels',
            format: 'BO3',
            status: 'completed',
            maps: JSON.stringify(['Haven', 'Bind']),
            results: JSON.stringify([
                { map: 1, mapName: 'Haven', score: 'LOSS', image: null, results: [] },
                { map: 2, mapName: 'Bind', score: 'LOSS', image: null, results: [] }
            ])
        },
        {
            date: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
            opponent: 'Cloud9',
            format: 'BO1',
            status: 'completed',
            maps: JSON.stringify(['Lotus']),
            results: JSON.stringify([
                { map: 1, mapName: 'Lotus', score: 'WIN', image: null, results: [] }
            ])
        }
    ];

    for (const s of scrimData) {
        const newScrim = await db.insert(scrims).values({
            teamId: team.id,
            date: s.date,
            opponent: s.opponent,
            format: s.format,
            status: s.status,
            maps: s.maps,
            results: s.results
        }).returning().get();

        console.log(`Created Scrim ID: ${newScrim.id} vs ${newScrim.opponent}`);

        // 4. Create Stats for each player
        for (const player of teamPlayers) {
            // Randomize stats
            const kills = Math.floor(Math.random() * 25) + 5;
            const deaths = Math.floor(Math.random() * 20) + 5;
            const assists = Math.floor(Math.random() * 15);
            const acs = Math.floor(Math.random() * 300) + 100;
            const isWin = s.results.includes('WIN'); // Simple heuristic

            await db.insert(scrimPlayerStats).values({
                scrimId: newScrim.id,
                playerId: player.id,
                kills,
                deaths,
                assists,
                acs,
                isWin: isWin ? 1 : 0
            });
        }
    }

    console.log('Done!');
}

seedScrims();
