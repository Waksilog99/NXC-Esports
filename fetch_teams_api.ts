
async function fetchTeams() {
    try {
        const res = await fetch('http://localhost:3001/api/teams');
        const data = await res.json();
        // Look at the first team's first player
        if (data.length > 0 && data[0].players.length > 0) {
            const player = data[0].players[0];
            console.log('Sample Player from /api/teams:', JSON.stringify({
                name: player.name,
                level: player.level,
                xp: player.xp
            }, null, 2));
        } else {
            console.log('No teams or players found.');
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

fetchTeams();
