
import { GoogleGenAI } from "@google/genai";

export const getTeamAnalysis = async (stats: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  const prompt = `
    As an expert Esports Strategic Coach, analyze the following team performance metrics:
    ${JSON.stringify(stats)}
    
    Provide a concise, motivating summary (max 3 sentences) focusing on:
    1. Key strength based on the numbers.
    2. One area for tactical improvement.
    3. A brief strategic directive for the upcoming tournament season.
    
    Keep the tone professional and futuristic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    return response.text || "Analysis currently unavailable.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Tactical data processing failed. Please reconnect to the Nexus.";
  }
};
