
import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult, UsageResult } from "../types";
import { processScan, processUsage } from "./apiService";

// Always use new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
};

export const scanReceipt = async (base64Image: string): Promise<ScanResult[]> => {
  try {
    const ai = getAIClient();

    if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'PLACEHOLDER_API_KEY') {
      throw new Error('VITE_GEMINI_API_KEY not configured. Please add your API key to .env.local');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
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
              text: "Analyze this receipt image and extract all food/pantry items. For each item, identify:\n- name: the product name\n- quantity: the amount purchased (number)\n- unit: unit of measurement (e.g., lbs, oz, units, ct, fl oz, bottles, cans, boxes, bags)\n- category: one of (produce, pantry, dairy, frozen, meat, beverages, snacks, other)\n\nReturn ONLY a valid JSON array with no markdown formatting.",
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

    if (!response.text) {
      throw new Error('Empty response from Gemini API');
    }

    let results: ScanResult[];
    try {
      // Try to parse the response directly
      results = JSON.parse(response.text);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON from markdown
      const jsonMatch = response.text.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Gemini response as JSON');
      }
    }

    if (!Array.isArray(results)) {
      throw new Error('Response is not an array');
    }

    // Send scan results to backend for logging
    try {
      await processScan(results);
    } catch (err) {
      console.warn('Failed to log scan to backend:', err);
      // Non-critical: continue even if backend logging fails
    }

    return results;
  } catch (e) {
    console.error("scanReceipt error:", e);
    throw e; // Re-throw so UI can display the error
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
    const results = JSON.parse(response.text || "[]");
    // Send usage results to backend
    await processUsage(results);
    return results;
  } catch (e) {
    console.error("Failed to parse usage JSON", e);
    return [];
  }
};
