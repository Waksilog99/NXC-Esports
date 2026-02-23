
const Database = require('better-sqlite3');
const db = new Database('local.db');

const rows = db.prepare('SELECT p.id, p.name, p.xp FROM players p WHERE p.level = 1').all();

console.log('Level 1 Players (14 total):');
console.table(rows);

db.close();
