const Database = require('better-sqlite3');
const db = new Database('local.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in DB:', tables.map(t => t.name));

const tournamentTable = db.prepare("PRAGMA table_info(tournaments)").all();
console.log('Tournament Table Schema:', tournamentTable);

db.close();
