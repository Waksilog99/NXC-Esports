import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function audit() {
    try {
        console.log("Fetching products with via.placeholder.com...");
        const products = await sql`SELECT id, name, image_url FROM products WHERE image_url LIKE '%via.placeholder.com%'`;
        console.log(`Found ${products.length} products with broken URLs.`);

        if (products.length > 0) {
            console.log("Updating broken URLs to placehold.co...");
            for (const p of products) {
                const newUrl = p.image_url.replace('via.placeholder.com', 'placehold.co');
                await sql`UPDATE products SET image_url = ${newUrl} WHERE id = ${p.id}`;
                console.log(`Updated product ${p.id}: ${p.name}`);
            }
            console.log("Update complete.");
        } else {
            console.log("No broken URLs found in products table.");
        }

    } catch (err) {
        console.error("Audit failed:", err.message);
    } finally {
        await sql.end();
    }
}

audit();
