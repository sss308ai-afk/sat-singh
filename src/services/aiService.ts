import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const orchestrateAI = async (text: string, intent: 'correct' | 'translate' | 'query', provider: string) => {
  const model = "gemini-3-flash-preview";
  
  let systemInstruction = "";
  if (intent === 'correct') {
    systemInstruction = "You are an expert editor. Correct the following text for grammar, spelling, and flow in Hindi/English/Hinglish. Return ONLY the corrected text.";
  } else if (intent === 'translate') {
    systemInstruction = "You are an expert translator. Translate the following text between Hindi and English as appropriate. Return ONLY the translated text.";
  } else {
    systemInstruction = "You are a helpful assistant. Provide a concise answer to the following query. Return ONLY the answer.";
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: text,
      config: {
        systemInstruction,
      },
    });
    return response.text || "AI Error: No response";
  } catch (error) {
    console.error("AI Orchestration Error:", error);
    return `Error calling ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};
