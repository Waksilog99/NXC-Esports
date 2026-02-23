const Database = require('better-sqlite3');
try {
    const db = new Database('local.db');
    const row = db.prepare('SELECT count(*) as count FROM users').get();
    console.log('Database Check: SUCCESS');
    console.log('User Count:', row.count);
    db.close();
} catch (err) {
    console.error('Database Check: FAILED');
    console.error(err);
    process.exit(1);
}
