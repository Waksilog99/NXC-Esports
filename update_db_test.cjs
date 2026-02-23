const Database = require('better-sqlite3');
const db = new Database('local.db');
try {
    const info = db.prepare('UPDATE users SET games_played = ?, fullname = ? WHERE id = 2').run(
        JSON.stringify(["League of Legends", "Valorant"]),
        "Waks (Backend Test)"
    );
    console.log("Update info:", info);
    const row = db.prepare('SELECT id, fullname, games_played FROM users WHERE id = 2').get();
    console.log("Updated Row:", row);
} catch (e) {
    console.error(e);
}
db.close();
