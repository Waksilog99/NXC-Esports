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
        console.log("Checking products data...");
        const productsList = await sql`SELECT id, name, sponsor_id FROM products`;
        console.log("Found products:", productsList.length);

        const sponsorsList = await sql`SELECT id FROM sponsors`;
        const validSponsorIds = new Set(sponsorsList.map(s => s.id));
        console.log("Valid Sponsor IDs:", Array.from(validSponsorIds));

        let orphansFound = 0;
        for (const p of productsList) {
            if (p.sponsor_id !== null && !validSponsorIds.has(p.sponsor_id)) {
                console.log(`Orphan found: Product ${p.id} (${p.name}) has sponsor_id ${p.sponsor_id}`);
                await sql`UPDATE products SET sponsor_id = NULL WHERE id = ${p.id}`;
                orphansFound++;
            }
        }
        console.log(`Cleaned up ${orphansFound} orphans.`);

        console.log("Dropping existing foreign key constraints...");
        // Drop common default names
        await sql`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sponsor_id_users_id_fk`;
        await sql`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sponsor_id_fkey`;

        console.log("Adding new constraint referencing sponsors(id)...");
        await sql`ALTER TABLE products ADD CONSTRAINT products_sponsor_id_sponsors_id_fk FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)`;

        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await sql.end();
    }
}

migrate();
