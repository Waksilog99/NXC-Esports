
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

async function runTest() {
    console.log('🧪 Starting Scheduler End-to-End Test...');

    // 1. Calculate a time 5 minutes from now (within the 1h window)
    const now = new Date();
    const targetTime = new Date(now.getTime() + 5 * 60 * 1000);

    console.log(`📅 Creating dummy event for: ${targetTime.toISOString()} (in 5m)`);

    // 2. Insert Dummy Event
    const [insertedEvent] = await db.insert(events).values({
        title: "🤖 ENHANCED SCHEDULER TEST",
        description: "Testing @everyone tag and Image Attachment.",
        location: "Test Script Execution",
        date: targetTime.toISOString(),
        status: 'upcoming',
        image: 'assets/dummy_event_poster.png'
    }).returning();

    console.log(`✅ Event created with ID: ${insertedEvent.id}`);
    console.log('⏳ Waiting for scheduler to pick it up (this may take up to 2 minutes)...');

    // 3. Poll for Notification
    const maxRetries = 15; // 15 * 10s = 150s (2.5 mins)
    let retries = 0;

    const checkInterval = setInterval(async () => {
        retries++;
        process.stdout.write(`\r🔎 Check #${retries}/${maxRetries}... `);

        const notifications = await db.select().from(eventNotifications)
            .where(and(
                eq(eventNotifications.eventId, insertedEvent.id),
                eq(eventNotifications.type, '1h')
            ));

        if (notifications.length > 0) {
            clearInterval(checkInterval);
            console.log('\n\n🎉 SUCCESS! Notification record found!');
            console.log(notifications[0]);
            console.log('\n🧹 Cleaning up test event...');

            // Cleanup
            await db.delete(eventNotifications).where(eq(eventNotifications.eventId, insertedEvent.id));
            await db.delete(events).where(eq(events.id, insertedEvent.id));

            console.log('✨ Cleanup complete. Test Passed.');
            process.exit(0);
        }

        if (retries >= maxRetries) {
            clearInterval(checkInterval);
            console.log('\n\n❌ TIMEOUT: Scheduler did not send notification in time.');
            console.log('Possible reasons:');
            console.log('- Server is not running');
            console.log('- Scheduler logic has a bug');
            console.log('- Time window calculation is off');

            console.log('\n🧹 Cleaning up test event...');
            await db.delete(eventNotifications).where(eq(eventNotifications.eventId, insertedEvent.id));
            await db.delete(events).where(eq(events.id, insertedEvent.id));

            process.exit(1);
        }
    }, 10000); // Check every 10 seconds
}

runTest().catch((err) => {
    console.error('❌ Test Script Failed:', err);
    if (err.code) console.error('Error Code:', err.code);
    if (err.message) console.error('Error Message:', err.message);
});
