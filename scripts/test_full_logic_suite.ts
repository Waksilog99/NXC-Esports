
import { db } from '../server/db';
import { events, eventNotifications } from '../server/schema';
import { eq, inArray } from 'drizzle-orm';
import 'dotenv/config';

async function runTest() {
    console.log('🧪 Starting Full Notification Logic Suite...');

    const now = new Date();

    // SCENARIO 1: Urgent (< 1h) -> Should trigger '1h' (Minutes)
    const tCurrentPlus10m = new Date(now.getTime() + 10 * 60 * 1000);

    // SCENARIO 2: Mid-Range (1h < T < 24h) -> Should be SILENT
    const tCurrentPlus5h = new Date(now.getTime() + 5 * 60 * 60 * 1000);

    // SCENARIO 3: Long-Range (23h < T < 24h) -> Should trigger '1d'
    const tCurrentPlus23_5h = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);

    // SCENARIO 4: Extended-Range (71h < T < 72h) -> Should trigger '3d'
    const tCurrentPlus71_5h = new Date(now.getTime() + 71.5 * 60 * 60 * 1000);

    // SCENARIO 5: Boundary (T = 1h) -> Should trigger '1h'
    const tCurrentPlus60m = new Date(now.getTime() + 60 * 60 * 1000);

    console.log(`1. Urgent (10m): ${tCurrentPlus10m.toISOString()}`);
    console.log(`2. Mid (5h): ${tCurrentPlus5h.toISOString()}`);
    console.log(`3. Long (23.5h): ${tCurrentPlus23_5h.toISOString()}`);
    console.log(`4. Extended (71.5h): ${tCurrentPlus71_5h.toISOString()}`);
    console.log(`5. Boundary (60m): ${tCurrentPlus60m.toISOString()}`);

    // Insert Events
    const [ev1] = await db.insert(events).values({ title: "TEST 1: Urgent", date: tCurrentPlus10m.toISOString(), status: 'upcoming' }).returning();
    const [ev2] = await db.insert(events).values({ title: "TEST 2: Mid Silent", date: tCurrentPlus5h.toISOString(), status: 'upcoming' }).returning();
    const [ev3] = await db.insert(events).values({ title: "TEST 3: 1 Day", date: tCurrentPlus23_5h.toISOString(), status: 'upcoming' }).returning();
    const [ev4] = await db.insert(events).values({ title: "TEST 4: 3 Days", date: tCurrentPlus71_5h.toISOString(), status: 'upcoming' }).returning();
    const [ev5] = await db.insert(events).values({ title: "TEST 5: 1 Hour", date: tCurrentPlus60m.toISOString(), status: 'upcoming' }).returning();

    console.log('⏳ Waiting 15s for scheduler cycle...');

    // Allow scheduler to run
    let successCount = 0;

    // Poll loop
    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 10000));
        process.stdout.write('.');

        const n1 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev1.id));
        const n2 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev2.id));
        const n3 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev3.id));
        const n4 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev4.id));
        const n5 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev5.id));

        // Validation Logic
        const s1 = n1.length > 0 && n1[0].type === '1h'; // Expect 1h
        // Note: ev2 (Mid) will now trigger 'created_mid' because it's a new event < 24h!
        // The user wanted "Silent" for mid-range only if existing history.
        // But here we create FRESH events.
        // So ev2 SHOULD trigger 'created_mid'.
        // I need to update expectations for ev2 or simulate history if I want silence.
        // Let's assume we want to verify the "New Event Mid-Range Catchup" here.
        const s2 = n2.length > 0 && n2[0].type === 'created_mid';

        const s3 = n3.length > 0 && n3[0].type === '1d'; // Expect 1d
        const s4 = n4.length > 0 && n4[0].type === '3d'; // Expect 3d
        const s5 = n5.length > 0 && n5[0].type === '1h'; // Expect 1h

        if (s1 && s2 && s3 && s4 && s5) {
            console.log('\n\n🎉 ALL SCENARIOS PASSED!');
            console.log('✅ Scenario 1 (Urgent): Triggered 1h');
            console.log('✅ Scenario 2 (Mid - New): Triggered catch-up');
            console.log('✅ Scenario 3 (1 Day): Triggered 1d');
            console.log('✅ Scenario 4 (3 Days): Triggered 3d');
            console.log('✅ Scenario 5 (1 Hour): Triggered 1h');

            await cleanup([ev1.id, ev2.id, ev3.id, ev4.id, ev5.id]);
            process.exit(0);
        }
    }

    console.error('\n\n❌ TIMEOUT: Not all scenarios matched expectations.');

    // Debug Dump
    const n1 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev1.id));
    const n2 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev2.id));
    const n3 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev3.id));
    const n4 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev4.id));
    const n5 = await db.select().from(eventNotifications).where(eq(eventNotifications.eventId, ev5.id));

    console.log('Ev1 (Urgent):', n1);
    console.log('Ev2 (Mid):', n2);
    console.log('Ev3 (1d):', n3);
    console.log('Ev4 (3d):', n4);
    console.log('Ev5 (1h):', n5);

    await cleanup([ev1.id, ev2.id, ev3.id, ev4.id, ev5.id]);
    process.exit(1);
}

async function cleanup(ids: number[]) {
    console.log('🧹 Cleaning up...');
    if (ids.length > 0) {
        await db.delete(eventNotifications).where(inArray(eventNotifications.eventId, ids));
        await db.delete(events).where(inArray(events.id, ids));
    }
}

runTest();
