
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBillAnalysis = async (title: string, description: string): Promise<AIAnalysis> => {
  try {
    const prompt = `
      You are a helpful political analyst explaining Israeli legislation to the general public in plain Hebrew.
      
      Bill Title: ${title}
      Bill Description: ${description}
      
      Please analyze this bill and provide a structured summary in Hebrew:
      1. currentSituation: What is the situation today? (Start with "כיום...")
      2. proposedChange: What will actually change? (Start with "החוק מציע..." or "בפועל...")
      3. beneficiaryPopulation: Who specifically benefits? (e.g., "נהגים", "הורים", "תושבי הצפון")

      Tone: Clear, objective, and simple (ELI5).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentSituation: { type: Type.STRING, description: "The situation today in simple Hebrew." },
            proposedChange: { type: Type.STRING, description: "The concrete change this bill introduces." },
            beneficiaryPopulation: { type: Type.STRING, description: "The specific group of people who benefit." }
          },
          required: ["currentSituation", "proposedChange", "beneficiaryPopulation"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysis;
    }
    
    throw new Error("No response from AI");
  } catch (error) {
    console.warn("AI Analysis unavailable:", error);
    return {
      currentSituation: "לא ניתן היה לנתח את החוק כרגע.",
      proposedChange: "אנא נסו שוב במועד מאוחר יותר.",
      beneficiaryPopulation: "לא ידוע"
    };
  }
};
