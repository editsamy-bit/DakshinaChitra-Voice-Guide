import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../src/constants/prompts";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, language, history } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  try {
    const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
        history: history || [],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
        systemInstruction: `${SYSTEM_PROMPT}\n\nIMPORTANT: You must respond ONLY in ${language || 'English'}. Use the script and vocabulary common to ${language || 'English'} speakers.`,
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      res.status(200).json({ text: response.text() });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      return res.status(429).json({ error: "QUOTA_EXHAUSTED" });
    }
    res.status(500).json({ error: "Failed to generate response" });
  }
}
