
async function fetchTeams() {
    try {
        const res = await fetch('http://localhost:3001/api/teams');
        const data = await res.json();
        const allPlayers = data.flatMap(t => t.players);
        const levelCounts = allPlayers.reduce((acc, p) => {
            const lvl = p.level || 'undefined/null';
            acc[lvl] = (acc[lvl] || 0) + 1;
            return acc;
        }, {});

        console.log('Level Counts in /api/teams response:');
        console.log(JSON.stringify(levelCounts, null, 2));

        if (levelCounts[2]) {
            const p2 = allPlayers.find(p => p.level === 2);
            console.log('Sample Level 2 Player:', p2.name);
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

fetchTeams();
