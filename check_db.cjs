const Database = require('better-sqlite3');
const db = new Database('local.db');
const rows = db.prepare('SELECT id, username, email, games_played, avatar FROM users').all();
console.log(JSON.stringify(rows, (key, value) => {
    if (key === 'avatar' && value) return `(Base64, length: ${value.length})`;
    return value;
}, 2));
db.close();
