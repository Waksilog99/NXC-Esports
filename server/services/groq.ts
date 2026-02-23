interface AIResult {
    isVictory: boolean;
    results: Array<{
        name: string;
        kills: number;
        deaths: number;
        assists: number;
        acs: number;
        originalName?: string;
    }>;
}

export const analyzeScoreboardWithGroq = async (base64Image: string, roster: any[]): Promise<AIResult> => {
    try {
        console.log("[Groq] Starting analysis... (Lazy Loading)");

        if (!process.env.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is missing in .env");
        }

        const { default: Groq } = await import('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const rosterNames = roster.map((p: any) => p.name).join(', ');

        const imageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;

        const prompt = `
            Analyze this esports scoreboard image.
            The team roster is: [${rosterNames}].
            
            Extract the K/D/A stats AND ACS (Average Combat Score) for players that match the roster or appear to be on the same team.
            If ACS is not visible, set it to 0.
            
            Return a valid JSON object with:
            - isVictory: boolean
            - results: Array of { name: string, kills: number, deaths: number, assists: number, acs: number }
            
            Do not include any markdown or explanation. Just the JSON.
        `;

        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": prompt },
                        {
                            "type": "image_url",
                            "image_url": { "url": imageUrl }
                        }
                    ]
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0,
            "stream": false,
            "response_format": { "type": "json_object" }
        });

        const content = chatCompletion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty response from Groq");

        console.log("[Groq] Response:", content.substring(0, 100) + "...");

        const parsed = JSON.parse(content);
        return parsed;

    } catch (error: any) {
        console.error("[Groq] Failed:", error);
        throw new Error(`Groq Analysis failed: ${error.message}`);
    }
};
