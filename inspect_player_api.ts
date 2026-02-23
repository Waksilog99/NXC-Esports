
async function fetchTeams() {
    try {
        const res = await fetch('http://localhost:3001/api/teams');
        const data = await res.json();
        const allPlayers = data.flatMap(t => t.players);
        const level2Player = allPlayers.find(p => p.level > 1);

        if (level2Player) {
            console.log('Full Level 2 Player Object:');
            console.log(JSON.stringify(level2Player, null, 2));
        } else {
            console.log('No Level 2 players found.');
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

fetchTeams();
