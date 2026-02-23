
import { db } from '../server/db';
import { events } from '../server/schema';
import { eq } from 'drizzle-orm';

async function runTest() {
    console.log('🧪 Starting Ongoing Status Test...');

    // 1. Create event 5 seconds in the past (Should trigger 'on-going')
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);

    console.log(`📅 Creating dummy event for: ${fiveSecondsAgo.toISOString()} (5s ago)`);

    const [insertedEvent] = await db.insert(events).values({
        title: "🔴 LIVE EVENT TEST",
        description: "This event should be on-going.",
        location: "Test Script",
        date: fiveSecondsAgo.toISOString(),
        status: 'upcoming',
        image: 'assets/dummy_event_poster.png'
    }).returning();

    console.log(`✅ Event created with ID: ${insertedEvent.id}, Status: ${insertedEvent.status}`);
    console.log('⏳ Waiting for scheduler to process it (up to 2 mins)...');

    // 2. Poll for status change
    const maxRetries = 15;
    let retries = 0;

    const checkInterval = setInterval(async () => {
        retries++;
        process.stdout.write(`\r🔎 Check #${retries}/${maxRetries}... `);

        const event = await db.select().from(events).where(eq(events.id, insertedEvent.id)).get();

        if (event && event.status === 'on-going') {
            console.log('\n🎉 SUCCESS! Event status changed to on-going!');
            clearInterval(checkInterval);

            // Cleanup
            console.log('\n🧹 Cleaning up...');
            await db.delete(events).where(eq(events.id, insertedEvent.id));
            process.exit(0);
        }

        if (retries >= maxRetries) {
            console.log(`\n❌ TIMEOUT: Event status is ${event?.status}, expected on-going.`);
            console.log('\n🧹 Cleaning up...');
            await db.delete(events).where(eq(events.id, insertedEvent.id));
            process.exit(1);
        }
    }, 10000);
}

runTest();
