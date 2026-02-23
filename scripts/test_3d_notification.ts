
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

async function runTest() {
    console.log('🧪 Starting 3-Day Notification Test...');

    const now = new Date();
    // 71.5 hours from now (inside 71h-72h window)
    const threeDayTime = new Date(now.getTime() + (71.5 * 60 * 60 * 1000));

    console.log(`📅 Creating 3-Day Event (71.5h away): ${threeDayTime.toISOString()}`);

    const [event] = await db.insert(events).values({
        title: "📅 3-DAY TEST",
        description: "Should trigger 3 Days notification.",
        date: threeDayTime.toISOString(),
        status: 'upcoming'
    }).returning();

    console.log('⏳ Waiting 15s for scheduler...');

    // Poll for notification
    let triggered = false;
    for (let i = 0; i < 6; i++) { // Check for ~60 seconds
        await new Promise(r => setTimeout(r, 10000));
        process.stdout.write('.');

        const notifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, event.id));
        if (notifs.length > 0) {
            console.log('\n\n🎉 SUCCESS! 3d Alert triggered.');
            console.log(notifs[0]);
            triggered = true;
            break;
        }
    }

    if (!triggered) {
        console.error('\n\n❌ FAILED: 3d Alert did not trigger.');
        await cleanup(event.id);
        process.exit(1);
    }

    await cleanup(event.id);
    console.log('✨ Test Complete.');
    process.exit(0);
}

async function cleanup(id: number) {
    await db.delete(eventNotifications).where(eq(eventNotifications.eventId, id));
    await db.delete(events).where(eq(events.id, id));
}

runTest();
