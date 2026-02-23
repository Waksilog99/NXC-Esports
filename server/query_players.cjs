const Database = require('better-sqlite3');
const db = new Database('local.db');
try {
    const players = db.prepare("SELECT u.id, u.username, u.role, p.team_id, t.name as teamName, t.game FROM users u JOIN players p ON u.id = p.user_id JOIN teams t ON p.team_id = t.id WHERE u.role LIKE '%player%'").all();
    console.log('Players:', JSON.stringify(players, null, 2));
} catch (e) {
    console.error('Error querying players:', e.message);
}
