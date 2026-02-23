
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { eq, inArray } from 'drizzle-orm';
import 'dotenv/config';

async function runTest() {
    console.log('🧪 Starting Mid-Range Catch-up Test...');

    const now = new Date();
    // T+5h
    const targetTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);

    // 1. Create Newly Created Event (Should Trigger)
    const [newEvent] = await db.insert(events).values({
        title: "📢 NEW MID-RANGE TEST",
        description: "Should trigger immediate catch-up alert.",
        date: targetTime.toISOString(),
        status: 'upcoming'
    }).returning();
    console.log(`new event id: ${newEvent.id}`);

    // 2. Create "Old" Event (Simulate prior history)
    const [oldEvent] = await db.insert(events).values({
        title: "🤫 OLD SILENT TEST",
        description: "Should REMAIN silent (history exists).",
        date: targetTime.toISOString(),
        status: 'upcoming'
    }).returning();
    console.log(`old event id: ${oldEvent.id}`);

    // Inject history for old event
    await db.insert(eventNotifications).values({
        eventId: oldEvent.id,
        type: '3d', // Simulate it notified 3 days ago
        sentAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    });

    console.log('⏳ Waiting 15s for scheduler...');

    let newTriggered = false;
    let oldTriggered = false;

    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 10000));
        process.stdout.write('.');

        const n1 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, newEvent.id));
        const n2 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, oldEvent.id));

        // Check New Event (Should have 'created_mid')
        if (n1.length > 0 && n1[0].type === 'created_mid') {
            newTriggered = true;
        }

        // Check Old Event (Should ONLY have '3d')
        // If it triggered catch-up, it would have 'created_mid' too (or length > 1)
        const oldHasCatchup = n2.some(n => n.type === 'created_mid');
        if (oldHasCatchup) {
            oldTriggered = true;
        }

        if (newTriggered) {
            break; // We can exit early if logic works, but let's wait a bit to ensure old doesn't trigger
        }
    }

    console.log('\n\n📊 Results:');
    console.log(`New Event Triggered: ${newTriggered ? '✅ YES' : '❌ NO'}`);
    console.log(`Old Event Triggered: ${oldTriggered ? '❌ YES (Fail)' : '✅ NO'}`);

    if (newTriggered && !oldTriggered) {
        console.log('🎉 SUCCESS! Logic distinguishes new events correctly.');
        await cleanup([newEvent.id, oldEvent.id]);
        process.exit(0);
    } else {
        console.log('❌ FAILED.');
        await cleanup([newEvent.id, oldEvent.id]);
        process.exit(1);
    }
}

async function cleanup(ids: number[]) {
    await db.delete(eventNotifications).where(inArray(eventNotifications.eventId, ids));
    await db.delete(events).where(inArray(events.id, ids));
}

runTest();
