import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString as string);

async function createTable() {
    try {
        console.log("Checking playbook_strategies table...");
        await sql`
            CREATE TABLE IF NOT EXISTS playbook_strategies (
                id SERIAL PRIMARY KEY,
                team_id INTEGER REFERENCES teams(id),
                title TEXT NOT NULL,
                map TEXT,
                category TEXT,
                side TEXT,
                priority TEXT DEFAULT 'medium',
                content TEXT,
                notes TEXT,
                images TEXT,
                "references" TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log("Table playbook_strategies created/verified successfully.");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        process.exit(0);
    }
}

createTable();
