import fetch from 'node-fetch';

const body = {
    name: "Test Asset",
    description: "Repro script test",
    price: 1000,
    stock: 10,
    imageUrl: "https://via.placeholder.com/150",
    sponsorId: null
};

async function test() {
    try {
        console.log("Sending POST to http://localhost:3001/api/products...");
        const res = await fetch('http://localhost:3001/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log("Response Status:", res.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}

test();
