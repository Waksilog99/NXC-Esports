import dotenv from 'dotenv';
import { resolve } from 'path';
import { GoogleGenAI } from '@google/genai';

// Load env
dotenv.config({ path: resolve(process.cwd(), '.env') });
const key = process.env.GEMINI_API_KEY || 'AIzaSyBca3tvJQAphJihWbsE40wNLj-w6uhKR4U';

async function listModels() {
    console.log("Using Key:", key.substring(0, 10) + "...");
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        // The new SDK structure might be different, let's try the standard way if this is the new one
        // If @google/genai is the *new* SDK (v0.1+), it uses different syntax than @google/generative-ai
        // But let's assume it has a listModels or we can try a simple generation with a fallback

        // Actually, let's try to just generate content with a known Safe model to test connection
        console.log("Testing connection with gemini-2.0-flash-exp...");
        try {
            await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
            });
            console.log("gemini-2.0-flash-exp WORKS");
        } catch (e: any) { console.log("gemini-2.0-flash-exp failed:", e.message); }

        console.log("Testing connection with gemini-1.5-flash-001...");
        try {
            await ai.models.generateContent({
                model: 'gemini-1.5-flash-001',
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
            });
            console.log("gemini-1.5-flash-001 WORKS");
        } catch (e: any) { console.log("gemini-1.5-flash-001 failed:", e.message); }

        console.log("Testing connection with gemini-1.5-pro...");
        try {
            await ai.models.generateContent({
                model: 'gemini-1.5-pro',
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
            });
            console.log("gemini-1.5-pro WORKS");
        } catch (e: any) { console.log("gemini-1.5-pro failed:", e.message); }

        console.log("Testing connection with gemini-flash-latest...");
        try {
            await ai.models.generateContent({
                model: 'gemini-flash-latest',
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
            });
            console.log("gemini-flash-latest WORKS");
        } catch (e: any) { console.log("gemini-flash-latest failed:", e.message); }

        console.log("Testing connection with gemini-2.0-flash-lite-preview-02-05...");
        try {
            await ai.models.generateContent({
                model: 'gemini-2.0-flash-lite-preview-02-05',
                contents: [{ role: 'user', parts: [{ text: 'Describe this image', inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' } }] }]
            });
            console.log("gemini-2.0-flash-lite-preview-02-05 WORKS (Multimodal)");
        } catch (e: any) { console.log("gemini-2.0-flash-lite-preview-02-05 failed:", e.message); }

        console.log("Testing connection with gemini-2.0-flash-lite...");
        try {
            await ai.models.generateContent({
                model: 'gemini-2.0-flash-lite',
                contents: [{ role: 'user', parts: [{ text: 'Describe this image', inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' } }] }]
            });
            console.log("gemini-2.0-flash-lite WORKS (Multimodal)");
        } catch (e: any) { console.log("gemini-2.0-flash-lite failed:", e.message); }
    } catch (e: any) {
        console.error("Fatal Error:", e);
    }
}

listModels();
