
import Database from 'better-sqlite3';
const sqlite = new Database('local.db');

const columnsToAdd = [
    { name: 'bio', type: 'TEXT' },
    { name: 'games_played', type: 'TEXT' },
    { name: 'achievements', type: 'TEXT' },
    { name: 'birthday', type: 'TEXT' },
    { name: 'role', type: 'TEXT DEFAULT "member"' }
];

console.log("Starting forced migration...");

columnsToAdd.forEach(col => {
    try {
        sqlite.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`Successfully added column: ${col.name}`);
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log(`Column already exists: ${col.name}`);
        } else {
            console.error(`Error adding column ${col.name}:`, err.message);
        }
    }
});

sqlite.close();
console.log("Migration finished.");
