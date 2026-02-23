import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
}

const main = async () => {
    console.log('Connecting to database...');
    const client = postgres(DATABASE_URL, {
        ssl: { rejectUnauthorized: false },
        connect_timeout: 10
    });

    try {
        console.log('Reading migration file...');
        const sqlPath = path.join(process.cwd(), 'drizzle', '0000_slippery_human_torch.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Split by statement-breakpoint
        const statements = sqlContent.split('--> statement-breakpoint');

        console.log(`Executing ${statements.length} statements...`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;

            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            try {
                await client.unsafe(stmt);
            } catch (err: any) {
                if (err.message.includes('already exists')) {
                    console.warn(`  [SKIP] Object already exists: ${err.message.split('\n')[0]}`);
                } else {
                    console.error(`  [ERROR] Statement ${i + 1} failed:`, err.message);
                    // Continue to next statement to allow partial success
                }
            }
        }

        console.log('Migration execution complete!');
    } catch (error: any) {
        console.error('Critical error during manual sync:', error);
    } finally {
        await client.end();
    }
};

main();
