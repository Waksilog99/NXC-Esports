import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function patch() {
    console.log("Applying database patches...");
    try {
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL`;
        console.log("- Added quantity to orders");

        await sql`ALTER TABLE "scrim_player_stats" ADD COLUMN IF NOT EXISTS "role" text`;
        console.log("- Added role to scrim_player_stats");

        await sql`ALTER TABLE "tournament_player_stats" ADD COLUMN IF NOT EXISTS "role" text`;
        console.log("- Added role to tournament_player_stats");

        console.log("All patches applied successfully!");
    } catch (err) {
        console.error("Patching failed:", err);
    } finally {
        await sql.end();
    }
}

patch();
