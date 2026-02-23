const Database = require('better-sqlite3');
const db = new Database('local.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
try {
    const teams = db.prepare("SELECT * FROM teams").all();
    console.log('Teams:', JSON.stringify(teams, null, 2));
} catch (e) {
    console.error('Error querying teams:', e.message);
}
