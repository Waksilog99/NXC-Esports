import http from 'http';

const body = JSON.stringify({
    name: "Repro Asset",
    description: "Repro description",
    price: 1000,
    stock: 5,
    imageUrl: "https://via.placeholder.com/150",
    sponsorId: 1
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/products',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
    }
};

const req = http.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${rawData}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(body);
req.end();
