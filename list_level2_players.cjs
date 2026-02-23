
const Database = require('better-sqlite3');
const db = new Database('local.db');

const rows = db.prepare(`
    SELECT p.name as player_name, t.name as team_name, p.level, p.xp 
    FROM players p 
    JOIN teams t ON p.team_id = t.id 
    WHERE p.level > 1 
    LIMIT 10
`).all();

console.log('Sample Level 2 Players and their Teams:');
console.table(rows);

db.close();
