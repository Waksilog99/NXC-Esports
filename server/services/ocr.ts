import Tesseract from 'tesseract.js';

interface OCRResult {
    isVictory: boolean;
    results: Array<{
        name: string;
        kills: number;
        deaths: number;
        assists: number;
        originalName?: string;
    }>;
}

export const analyzeScoreboardWithOCR = async (base64Image: string, roster: any[]): Promise<OCRResult> => {
    try {
        console.log("[OCR] Starting Tesseract analysis...");
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, 'base64');

        const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(0)}%`);
                }
            }
        });

        console.log("[OCR] Text extracted. Length:", text.length);
        console.log("[OCR] Raw Text Preview:", text.substring(0, 200).replace(/\n/g, ' '));

        return parseOCRText(text, roster);

    } catch (error) {
        console.error("[OCR] Failed:", error);
        throw new Error("OCR Analysis failed");
    }
};

const parseOCRText = (text: string, roster: any[]): OCRResult => {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const results: OCRResult['results'] = [];
    let isVictory = false;

    // 1. Detect Victory/Defeat
    const lowerText = text.toLowerCase();
    if (lowerText.includes('victory') || lowerText.includes('win') || lowerText.includes('won')) isVictory = true;

    // 2. Parse Lines for Player Stats
    // Strategy: Look for lines that contain a roster name AND numbers

    for (const player of roster) {
        const playerKey = player.name.toLowerCase();

        // Find line best matching this player
        // Simple string match
        const matchingLine = lines.find(line => line.toLowerCase().includes(playerKey));

        if (matchingLine) {
            console.log(`[OCR] Found match for ${player.name}: "${matchingLine}"`);

            // Extract numbers from this line
            // Regex to find sequences of numbers. 
            // Common formats: "Name 15 4 10" or "Name 15/4/10"
            const numbers = matchingLine.match(/\d+/g);

            if (numbers && numbers.length >= 3) {
                // Heuristic: KDA is usually the first 3 big numbers, or sometimes K/D/A is explicit
                // Let's assume K D A order if we find 3 numbers.
                // Depending on the game (Valorant vs COD), order might vary, but K D A is standard.

                // We take the first 3 numbers found on the line (excluding arguably small ones if they are rank? No, rank is complex)
                // Let's just take the first 3 integers.

                results.push({
                    name: player.name,
                    kills: Number(numbers[0]),
                    deaths: Number(numbers[1]),
                    assists: Number(numbers[2]),
                    originalName: matchingLine.trim() // store context
                });
            } else {
                // Found name but no stats - add with 0s so user can edit
                results.push({ name: player.name, kills: 0, deaths: 0, assists: 0 });
            }
        }
    }

    // If no players found (OCR failed to read names), we return empty/partial
    // The user will have to manual entry.

    return { isVictory, results };
};
