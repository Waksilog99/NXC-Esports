
import Database from 'better-sqlite3';
const db = new Database('local.db');

try {
    const rows = db.prepare('SELECT id, google_id as googleId, email, name, role, birthday FROM users').all();
    console.log('--- USERS IN DATABASE ---');
    console.table(rows);
    console.log('-------------------------');
} catch (err) {
    console.error('Failed to query database:', err.message);
} finally {
    db.close();
}
