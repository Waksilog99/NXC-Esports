
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

async function runTest() {
    console.log('🧪 Starting Smart Notification Logic Test...');

    const now = new Date();

    // Test Case 1: Urgent (10 minutes from now)
    const urgentTime = new Date(now.getTime() + 10 * 60 * 1000);
    // Test Case 2: Mid-range (5 hours from now) - Should NOT trigger 1d
    const midRangeTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    // Test Case 3: Long-range (25 hours from now) - Should trigger 1d later (but we can test 23h to see if it triggers 1d)
    const longRangeTime = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now (within 24h window)

    console.log(`📅 Creating Urgent Event (10m): ${urgentTime.toISOString()}`);
    console.log(`📅 Creating Mid-Range Event (5h): ${midRangeTime.toISOString()}`);
    console.log(`📅 Creating Long-Range Event (23h): ${longRangeTime.toISOString()}`);

    const [urgentEvent] = await db.insert(events).values({
        title: "🚨 URGENT TEST",
        description: "Should trigger 10m notification.",
        date: urgentTime.toISOString(),
        status: 'upcoming'
    }).returning();

    const [midEvent] = await db.insert(events).values({
        title: "⏳ MID-RANGE TEST",
        description: "Should NOT trigger anything immediately.",
        date: midRangeTime.toISOString(),
        status: 'upcoming'
    }).returning();

    const [longEvent] = await db.insert(events).values({
        title: "📅 LONG-RANGE TEST",
        description: "Should trigger 1 Day notification.",
        date: longRangeTime.toISOString(),
        status: 'upcoming'
    }).returning();

    console.log('⏳ Waiting for scheduler (2 mins)...');

    const checkInterval = setInterval(async () => {
        process.stdout.write('.');

        // Check Urgent
        const urgentNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, urgentEvent.id));

        // Check Mid
        const midNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, midEvent.id));

        // Check Long
        const longNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, longEvent.id));

        if (urgentNotifs.length > 0 && midNotifs.length === 0 && longNotifs.length > 0) {
            console.log('\n\n🎉 SUCCESS!');
            console.log('✅ Urgent Event triggered:', urgentNotifs[0].type); // Should be '1h' but with "10 Minutes" text
            console.log('✅ Mid-Range Event triggered: NONE');
            console.log('✅ Long-Range Event triggered:', longNotifs[0].type); // Should be '1d'

            clearInterval(checkInterval);
            await cleanup(urgentEvent.id, midEvent.id, longEvent.id);
            process.exit(0);
        }
    }, 10000);

    // Timeout
    setTimeout(async () => {
        console.log('\n\n❌ TIMEOUT or FAILURE');
        const urgentNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, urgentEvent.id));
        const midNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, midEvent.id));
        const longNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, longEvent.id));

        console.log('Urgent Notifs:', urgentNotifs);
        console.log('Mid Notifs:', midNotifs);
        console.log('Long Notifs:', longNotifs);

        await cleanup(urgentEvent.id, midEvent.id, longEvent.id);
        process.exit(1);
    }, 120000);
}

async function cleanup(id1: number, id2: number, id3: number) {
    console.log('🧹 Cleaning up...');
    await db.delete(eventNotifications).where(inArray(eventNotifications.eventId, [id1, id2, id3]));
    await db.delete(events).where(inArray(events.id, [id1, id2, id3]));
}

// Add inArray helper if not imported, or assume imports
import { inArray } from 'drizzle-orm';

runTest();
