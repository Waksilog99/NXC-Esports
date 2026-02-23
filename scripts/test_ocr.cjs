
const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = 'localhost';
const port = 3001;
const pathUrl = '/api/scrims/analyze';
const filePath = path.join(__dirname, 'test_image.png');

if (!fs.existsSync(filePath)) {
    console.error('Test image not found at', filePath);
    process.exit(1);
}

const fileContent = fs.readFileSync(filePath);
const base64Image = `data:image/png;base64,${fileContent.toString('base64')}`;

const postData = JSON.stringify({
    image: base64Image,
    teamId: 1 // Dummy team ID
});

const options = {
    hostname: hostname,
    port: port,
    path: pathUrl,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', data.substring(0, 500));
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
