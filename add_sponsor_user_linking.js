import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        console.log("Adding user_id column to sponsors table...");
        await sql`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`;

        console.log("Linking sponsor_admin (ID 10) to TechCore (ID 1)...");
        // We saw in previous logs that techcore is ID 1 and sponsor_admin is ID 10
        await sql`UPDATE sponsors SET user_id = 10 WHERE id = 1`;

        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await sql.end();
    }
}

migrate();
