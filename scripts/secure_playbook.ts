import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString as string);

async function secureTables() {
    try {
        console.log("Applying security policies to playbook_strategies and orders tables...");

        const sqlPath = path.join(__dirname, 'apply_rls_playbook.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Execute the SQL content.
        await sql.unsafe(sqlContent);

        console.log("Security policies applied successfully.");
    } catch (err) {
        console.error("Error securing table:", err);
    } finally {
        process.exit(0);
    }
}

secureTables();
