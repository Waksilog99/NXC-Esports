const Database = require('better-sqlite3');
const db = new Database('local.db');

console.log('Running migrations...');
try { db.prepare("ALTER TABLE achievements ADD COLUMN game TEXT").run(); } catch (e) { console.log('Game column already exists or migration skipped.'); }

const achievements = [
    // Top Tier (Champion/1st) - To test priority
    { title: 'EWC 2024 Apex Champions', game: 'Apex Legends', date: '2024-08-15', description: 'Crowned champions of the World Cup.', placement: 'Champion' },
    { title: 'Valorant Masters Tokyo', game: 'Valorant', date: '2024-06-20', description: 'Dominant 1st place finish.', placement: '1st Place' },
    { title: 'Dota 2 Riyadh Masters', game: 'Dota 2', date: '2024-07-30', description: 'Secured the trophy in Riyadh.', placement: '1st Place' },

    // Mid Tier (2nd/Runner Up)
    { title: 'CS2 PGL Major', game: 'Counter-Strike 2', date: '2024-03-31', description: 'Hard fought second place.', placement: '2nd Place' },
    { title: 'League of Legends LEC Summer', game: 'League of Legends', date: '2024-08-25', description: 'Runner up in the summer split.', placement: 'Runner Up' },

    // Lower Tier (Top 5/Finalist)
    { title: 'MLBB M5 World Ship', game: 'Mobile Legends: Bang Bang', date: '2023-12-17', description: 'Top 4 finish globally.', placement: 'Top 4' },
    { title: 'Overwatch 2 World Cup', game: 'Overwatch 2', date: '2023-11-04', description: 'Finalist position secured.', placement: 'Finalist' },
    { title: 'PUBG Mobile Global Championship', game: 'PUBG Mobile', date: '2023-12-10', description: 'Top 5 finish.', placement: 'Top 5' },
    { title: 'Fortnite FNCS Global', game: 'Fortnite', date: '2023-10-15', description: 'Top 10 performance.', placement: 'Top 10' },

    // Archive Tier (More than 9)
    { title: 'Rocket League Major', game: 'Rocket League', date: '2023-07-02', description: 'Secured top 12.', placement: 'Finalist' },
    { title: 'Street Fighter 6 EVO', game: 'Street Fighter 6', date: '2023-08-06', description: 'Top 8 finish.', placement: 'Top 8' },
    { title: 'Tekken 8 Invitational', game: 'Tekken 8', date: '2024-02-10', description: 'Invitational winners.', placement: '1st Place' },
    { title: 'Rainbow Six North Island', game: 'Rainbow Six Siege', date: '2023-05-20', description: 'Regional victory.', placement: '1st Place' },
    { title: 'Valorant Challengers', game: 'Valorant', date: '2023-04-15', description: 'First major regional win.', placement: '1st Place' },
    { title: 'Apex Pro League', game: 'Apex Legends', date: '2023-03-10', description: 'Split 1 Champions.', placement: 'Champion' }
];

console.log('Seeding achievements for testing...');

const insert = db.prepare('INSERT INTO achievements (title, date, description, placement, game) VALUES (?, ?, ?, ?, ?)');

achievements.forEach(a => {
    insert.run(a.title, a.date, a.description, a.placement, a.game);
});

console.log('Successfully seeded 15 achievements.');
db.close();
