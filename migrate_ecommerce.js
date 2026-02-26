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
        console.log("Checking and adding site_settings table...");
        await sql`
            CREATE TABLE IF NOT EXISTS site_settings (
                id SERIAL PRIMARY KEY,
                waks_qr_ewallet TEXT,
                waks_qr_bank TEXT
            )
        `;
        console.log("site_settings table ready.");

        console.log("Adding columns to sponsors table...");
        // Use sub-queries or separate statements to avoid failure if column already exists
        await sql`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS qr_ewallet TEXT`;
        await sql`ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS qr_bank TEXT`;
        console.log("sponsors columns ready.");

        console.log("Adding columns to orders table...");
        await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT`;
        console.log("orders columns ready.");

        console.log("Updating orders status constraints if possible (informational)...");
        // Drizzle handles the logic, but we want to make sure the column exists.
        // If we want to check existing statuses:
        const orderStatuses = await sql`SELECT DISTINCT status FROM orders`;
        console.log("Current order statuses in DB:", orderStatuses.map(s => s.status));

        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await sql.end();
    }
}

migrate();
