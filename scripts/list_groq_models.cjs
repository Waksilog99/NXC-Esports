
const Groq = require('groq-sdk');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    try {
        const models = await groq.models.list();
        console.log("Available Models:");
        models.data.forEach(m => console.log(`- ${m.id}`));
    } catch (e) {
        console.error("Error listing models:", e.message);
    }
}

main();
