
async function fetchTeams() {
    try {
        const res = await fetch('http://localhost:3001/api/teams');
        const data = await res.json();
        const allPlayers = data.flatMap(t => t.players);
        const level2Player = allPlayers.find(p => p.level > 1);

        if (level2Player) {
            console.log('Level 2 Player found:', JSON.stringify({
                name: level2Player.name,
                level: level2Player.level,
                xp: level2Player.xp
            }, null, 2));
        } else {
            console.log('No Level 2 players found in the API response.');
            // Print first few players to see what we have
            console.log('Sample Players:', JSON.stringify(allPlayers.slice(0, 5).map(p => ({
                name: p.name,
                level: p.level,
                xp: p.xp
            })), null, 2));
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

fetchTeams();
