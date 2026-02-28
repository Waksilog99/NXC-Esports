import fetch from 'node-fetch';

async function testFetch() {
    try {
        console.log("Fetching /api/teams/4/playbook...");
        const res = await fetch('http://localhost:3001/api/teams/4/playbook');
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

testFetch();
