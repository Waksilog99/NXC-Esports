
import http from 'http';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function verifySync() {
    try {
        // 1. Get Teams
        const teams = await fetchJson('http://localhost:3001/api/teams');

        if (!teams || teams.length === 0) { console.log("No teams found."); return; }

        const team = teams[0]; // Check first team
        console.log(`Checking Team: ${team.name} (ID: ${team.id})`);

        // 2. Roster Stats (from /api/teams)
        const rosterPlayers = team.players;
        console.log("\n--- ROSTER API (/api/teams) ---");
        rosterPlayers.forEach(p => {
            console.log(`[${p.name}] K/D: ${p.kda} | ACS: ${p.acs} | WR: ${p.winRate}`);
        });

        // 3. Performance Stats (from /api/teams/:id/stats)
        const perfData = await fetchJson(`http://localhost:3001/api/teams/${team.id}/stats`);

        console.log("\n--- PERFORMANCE API (/api/teams/:id/stats) ---");
        if (perfData && perfData.topPlayers) {
            perfData.topPlayers.forEach(p => {
                console.log(`[${p.name}] K/D: ${p.kd} | ACS: ${p.avgAcs}`);
            });
        } else {
            console.log("No performance data found.");
        }

    } catch (e) {
        console.error(e);
    }
}

verifySync();
