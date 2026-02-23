
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

async function runTest() {
    console.log('🧪 Starting Mid-Range Transition Test...');

    const now = new Date();
    // 1. Create Event at T+70 minutes (Outside 1h window)
    const futureTime = new Date(now.getTime() + 70 * 60 * 1000); // 1h 10m

    console.log(`📅 Creating Mid-Range Event (70m away): ${futureTime.toISOString()}`);

    const [event] = await db.insert(events).values({
        title: "⏳ TRANSITION TEST",
        description: "Should wait, then trigger.",
        date: futureTime.toISOString(),
        status: 'upcoming'
    }).returning();

    console.log('⏳ Waiting 15s for scheduler (Should be SILENT)...');

    // Wait to ensure NO notification is sent initially
    await new Promise(r => setTimeout(r, 15000));

    const initialNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, event.id));

    if (initialNotifs.length > 0) {
        console.error('❌ FAILED: Notification sent too early!', initialNotifs);
        await cleanup(event.id);
        process.exit(1);
    } else {
        console.log('✅ Correctly stayed silent outside 1h window.');
    }

    // 2. Simulate Time Passing (Update event to be 50m away)
    console.log('⏩ Fast-forwarding: Moving event to 50m away...');
    const soonTime = new Date(new Date().getTime() + 50 * 60 * 1000);

    await db.update(events)
        .set({ date: soonTime.toISOString() })
        .where(eq(events.id, event.id));

    console.log('⏳ Waiting 70s for scheduler (Should TRIGGER now)...');

    // Poll for notification
    let triggered = false;
    for (let i = 0; i < 7; i++) { // Check for ~70 seconds
        await new Promise(r => setTimeout(r, 10000));
        process.stdout.write('.');

        const laterNotifs = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, event.id));
        if (laterNotifs.length > 0) {
            console.log('\n\n🎉 SUCCESS! Alert triggered after entering 1h window.');
            console.log(laterNotifs[0]);
            triggered = true;
            break;
        }
    }

    if (!triggered) {
        console.error('\n\n❌ FAILED: Logic did not catch the event entering the window.');
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
