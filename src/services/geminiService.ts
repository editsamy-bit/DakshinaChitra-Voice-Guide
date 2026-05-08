import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, KNOWLEDGE_BASE } from "../constants/prompts";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function askAssistant(message: string, language: string = 'English', history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  const ai = getAI();
  try {
    const contents = [];
    if (history && Array.isArray(history)) {
       for (const item of history) {
           contents.push({ role: item.role, parts: item.parts });
       }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nIMPORTANT: You must respond ONLY in ${language || 'English'}. Use the script and vocabulary common to ${language || 'English'} speakers.`,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      return "QUOTA_EXHAEDED_ERROR";
    }
    
    if (error?.message?.includes('API key not valid') || error?.status === 400 || error?.status === 'INVALID_ARGUMENT') {
      return "INVALID_API_KEY_ERROR";
    }

    throw error;
  }
}

