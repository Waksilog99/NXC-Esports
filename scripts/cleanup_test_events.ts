
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { like } from 'drizzle-orm';

async function cleanup() {
    console.log('🧹 Cleaning up stale test events...');

    const testEvents = await db.select().from(events).where(like(events.title, '%TEST%'));

    for (const event of testEvents) {
        console.log(`Deleting event ${event.id}: ${event.title}`);
        await db.delete(eventNotifications).where(like(eventNotifications.eventId, event.id));
        await db.delete(events).where(like(events.id, event.id));
    }

    console.log('✨ Done.');
    process.exit(0);
}

cleanup().catch(console.error);
