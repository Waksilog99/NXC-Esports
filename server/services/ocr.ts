interface OCRResult {
    isVictory: boolean;
    results: Array<{
        name: string;
        kills: number;
        deaths: number;
        assists: number;
        agent?: string;
        originalName?: string;
    }>;
}

const VALORANT_AGENTS = ['Astra', 'Brimstone', 'Clove', 'Harbor', 'Omen', 'Viper', 'Jett', 'Neon', 'Phoenix', 'Raze', 'Reyna', 'Yoru', 'Iso', 'Waylay', 'Breach', 'Fade', 'Gekko', 'KAY_O', 'Skye', 'Sova', 'Tejo', 'Chamber', 'Cypher', 'Deadlock', 'Killjoy', 'Sage', 'Vyse'];

export const analyzeScoreboardWithOCR = async (base64Image: string, roster: any[]): Promise<OCRResult> => {
    try {
        console.log("[OCR] Starting Tesseract analysis... (Lazy Loading)");
        const { default: Tesseract } = await import('tesseract.js');

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
    for (const player of roster) {
        const playerKey = player.name.toLowerCase();

        // Find line best matching this player
        const matchingLine = lines.find(line => line.toLowerCase().includes(playerKey));

        if (matchingLine) {
            console.log(`[OCR] Found match for ${player.name}: "${matchingLine}"`);
            const lowerLine = matchingLine.toLowerCase();

            // Detect Agent
            const detectedAgent = VALORANT_AGENTS.find(agent => lowerLine.includes(agent.toLowerCase()));

            // Extract numbers from this line
            const numbers = matchingLine.match(/\d+/g);

            if (numbers && numbers.length >= 3) {
                results.push({
                    name: player.name,
                    kills: Number(numbers[0]),
                    deaths: Number(numbers[1]),
                    assists: Number(numbers[2]),
                    agent: detectedAgent,
                    originalName: matchingLine.trim()
                });
            } else {
                results.push({ name: player.name, kills: 0, deaths: 0, assists: 0, agent: detectedAgent });
            }
        }
    }

    return { isVictory, results };
};
