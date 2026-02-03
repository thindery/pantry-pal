
import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult, UsageResult } from "../types";

// Always use new GoogleGenAI({ apiKey: process.env.API_KEY })
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const scanReceipt = async (base64Image: string): Promise<ScanResult[]> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "Analyze this receipt and extract all food/pantry items. For each item, identify the name, quantity, unit (like lbs, oz, units, ct), and a general category. Return the data as a clean JSON array.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["name", "quantity"],
        },
      },
    },
  });

  try {
    // Access response.text property directly
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse receipt JSON", e);
    return [];
  }
};

export const analyzeUsage = async (base64Image: string): Promise<UsageResult[]> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "Identify the pantry items visible in this photo that are being used for cooking or preparation. Estimate the quantity being used (as a number). Return a JSON array of items and their used quantities.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantityUsed: { type: Type.NUMBER },
          },
          required: ["name", "quantityUsed"],
        },
      },
    },
  });

  try {
    // Access response.text property directly
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse usage JSON", e);
    return [];
  }
};
