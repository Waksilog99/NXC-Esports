import 'dotenv/config';
import { getDb } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
    const db = getDb();
    if (!db) {
        console.error("DB initialization failed");
        return;
    }

    try {
        console.log("Creating products table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                price INTEGER NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                sponsor_id INTEGER REFERENCES users(id),
                image_url TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Products table created or already exists.");

        console.log("Creating orders table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                product_id INTEGER REFERENCES products(id),
                recipient_name TEXT NOT NULL,
                delivery_address TEXT NOT NULL,
                contact_number TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Orders table created or already exists.");

        console.log("Migration finished successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    }

    process.exit(0);
}

main();
