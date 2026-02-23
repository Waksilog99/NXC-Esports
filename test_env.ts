import 'dotenv/config';
import { resolve } from 'path';

console.log("Current Directory:", process.cwd());
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
    console.log("Key length:", process.env.GEMINI_API_KEY.length);
    console.log("First 4 chars:", process.env.GEMINI_API_KEY.substring(0, 4));
} else {
    console.log("Trying explicit load...");
    const dotenv = await import('dotenv');
    const path = resolve(process.cwd(), '.env');
    console.log("Looking for .env at:", path);
    const result = dotenv.config({ path });
    if (result.error) {
        console.error("Dotenv error:", result.error);
    } else {
        console.log("Dotenv parsed:", result.parsed ? Object.keys(result.parsed) : 'null');
    }
}
