import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Persona, MarketItem } from "../types";

// CORREÇÃO 1: Usando a variável de ambiente correta do Vite
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Helper to get categories string
const getCatString = (cats: string[]) => cats.join(', ');

export const analyzeReceiptImage = async (base64Data: string, mimeType: string, availableCategories: string[]): Promise<Partial<Transaction>> => {
  try {
    const categoriesStr = getCatString(availableCategories);
    const response = await ai.models.generateContent({
      // CORREÇÃO 2: Modelo correto gemini-2.5-flash
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType, 
                data: base64Data
              }
            },
            {
              text: `Analyze this receipt/document. Extract the total amount, the merchant name (as description), the date (YYYY-MM-DD), and categorize it. 
              IMPORTANT: Try to fit the transaction into one of these existing categories: [${categoriesStr}]. 
              If it strictly does not fit any, suggest a new short category name in Portuguese.
              Return JSON.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            date: { type: Type.STRING, description: "ISO Date format YYYY-MM-DD" },
            category: { type: Type.STRING }
          },
          required: ["amount", "description", "category"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
};

export const analyzeFinancialStatement = async (base64Data: string, mimeType: string, incomeCats: string[], expenseCats: string[]): Promise<Partial<Transaction>[]> => {
  try {
    const inCats = getCatString(incomeCats);
    const exCats = getCatString(expenseCats);
    
    const response = await ai.models.generateContent({
      // CORREÇÃO 2: Modelo correto gemini-2.5-flash
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType, 
                data: base64Data
              }
            },
            {
              text: `Analyze this image or document. It is likely a bank statement, credit card bill, or list of transactions.
              Extract ALL visible transactions into a list.
              For each transaction:
              1. Identify date (YYYY-MM-DD). If year is missing, assume current year.
              2. Description (Merchant name).
              3. Amount (positive number).
              4. Type: 'income' (deposits, salaries, positive values in green) or 'expense' (payments, purchases, negative values).
              5. Category: Choose best fit from [${exCats}] for expenses, or [${inCats}] for income. If none fit, suggest a new Portuguese name.
              
              Return a JSON Array of objects.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['income', 'expense'] },
              category: { type: Type.STRING }
            },
            required: ["description", "amount", "type", "category"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error analyzing statement:", error);
    throw error;
  }
};

export const analyzeItemizedReceipt = async (base64Data: string, mimeType: string): Promise<{ merchant: string, date: string, total: number, items: Partial<MarketItem>[] }> => {
  try {
    const response = await ai.models.generateContent({
      // CORREÇÃO 2: Modelo correto gemini-2.5-flash
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType, 
                data: base64Data
              }
            },
            {
              text: `Analyze this grocery receipt. Extract the merchant name, date, total amount, and a detailed list of purchased items.
              For each item, extract:
              - Name (be specific, e.g., "Cerveja Heineken 350ml")
              - Category (e.g., "Bebida", "Açougue", "Limpeza", "Hortifruti", "Mercearia")
              - Price (total price for the item line)
              - Quantity (if available, otherwise 1)
              
              Return JSON.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            total: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["merchant", "total", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing itemized receipt:", error);
    throw error;
  }
};

export const getFinancialAdvice = async (
  message: string,
  history: { role: string, parts: { text: string }[] }[],
  persona: Persona,
  stats: { income: number; expense: number; topCategory: string },
  marketItems: MarketItem[] = [],
  transactions: Transaction[] = []
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  let systemInstruction = "";
  
  // App Manual / Knowledge Base
  const appDocs = `
  APP DOCUMENTATION (USE THIS TO EXPLAIN FEATURES):
  - **Dashboard**: Shows current Balance, Income/Expense cards, and charts (Daily Flow bar chart and Category Pie chart).
  - **Add Transaction**: 
    1. "Manual": Type value and description.
    2. "Magic (Camera)": Upload a receipt image/PDF, AI extracts data automatically.
  - **Batch / Statement ("Em Lote / Extrato")**: Upload a full bank statement or credit card bill (PDF/Image). AI extracts ALL transactions at once into a list you can edit.
  - **Market Sub-App ("Mercadinho")**: Accessible via the Basket icon in header.
    - Use "Scan" to upload grocery receipts. AI extracts EVERY SINGLE ITEM (e.g., Rice, Beer, Soap).
    - View history of purchases grouped by Receipt/Date.
    - Filter by month.
  - **Settings (Gear icon)**: Change Theme (Light/Dark), Manage Categories (Add/Edit/Delete), Export/Import CSV, Clear All Data.
  - **Filters**: Filter main list by Date (Month/Year) or Type/Category.
  `;

  // Build market context string
  const marketContext = marketItems.length > 0 
    ? `Current Market/Grocery Items History (Detailed): ${JSON.stringify(marketItems.slice(-50).map(i => ({ name: i.name, price: i.price, date: i.date })))}`
    : "No detailed market items available yet.";

  // Build transactions context string
  const transactionsContext = transactions.length > 0
    ? `Current General Transactions History (Summary): ${JSON.stringify(transactions.slice(-100).map(t => ({ date: t.date, desc: t.description, amount: t.amount, cat: t.category, type: t.type })))}`
    : "No general transactions available yet.";

  // INSTRUÇÕES COMUNS DE BUSCA INTELIGENTE
  const searchInstructions = `
  CRITICAL INSTRUCTION FOR DATA RETRIEVAL:
  When the user asks about a specific spending (e.g., "How much did I spend on McDonalds?", "Uber expenses?"):
  1. YOU MUST PERFORM A FUZZY SEARCH. Do NOT look for exact matches.
  2. Match ANY transaction where the 'desc' (description) CONTAINS the user's keyword.
     - Example: If user asks "McDonalds", MATCH "MCDONALDS SAO PAULO", "BURGER KING VS MCDONALDS", "PG *MCDONALDS".
     - Example: If user asks "Uber", MATCH "UBER *TRIP", "UBER EATS", "UBER BR".
  3. Case insensitive matching.
  4. AGGREGATE (SUM) the amounts of all matching transactions and report the total.
  5. List the individual transactions found to prove your point.
  `;

  if (persona === Persona.FORMAL) {
    systemInstruction = `You are a professional, polite, and objective financial consultant. 
    Your tone is like a bank manager. Be concise and data-driven.
    
    ${appDocs}
    ${searchInstructions}

    Current User Stats for this month: Income: ${stats.income}, Expense: ${stats.expense}, Top Expense Category: ${stats.topCategory}.
    
    DATA SOURCES:
    1. ${transactionsContext}
    2. ${marketContext}

    If the user asks about specific products (like beer, rice), check the Market Items History.
    If the user asks about general spending (Uber, Electricity, Salary), check the General Transactions History using the fuzzy search rules above.
    If asked about prices or market trends, USE GOOGLE SEARCH to find real-time information.
    If asked how to use the app, refer to the APP DOCUMENTATION above.`;
  } else {
    systemInstruction = `You are a "Sincere Consultant". You are a brutally honest friend who roasts the user for bad financial decisions. 
    Use slang, be funny, sarcasm is encouraged. If the user is spending too much, scold them. 
    If they are doing well, be skeptical.

    ${appDocs}
    ${searchInstructions}

    Current User Stats for this month: Income: ${stats.income}, Expense: ${stats.expense}, Top Expense Category: ${stats.topCategory}.
    
    DATA SOURCES:
    1. ${transactionsContext}
    2. ${marketContext}

    If the user asks about specific products (like "how much did I spend on beer?"), look at the Market Items History and roast them if it's high.
    If the user asks about general spending (like "Uber", "Ifood", "Rent"), look at the General Transactions History using FUZZY SEARCH (e.g., match "Uber" in "Uber Trip ...").
    If asked about prices, USE GOOGLE SEARCH to verify if they paid too much and roast them if they did.
    If asked how to use the app, explain it simply but with your sarcastic flair.
    Example: "You spent 500 on food? Do you think you are a king? Learn to cook!"`;
  }

  const response = await ai.models.generateContent({
    // CORREÇÃO 2: Modelo correto gemini-2.5-flash
    model: 'gemini-2.5-flash',
    contents: [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  
  // Extract grounding metadata
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const sources: { title: string; uri: string }[] = [];

  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri
        });
      }
    });
  }

  // Filter duplicate sources
  const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

  return { 
    text: text || "Não consegui pensar em uma resposta agora.", 
    sources: uniqueSources.length > 0 ? uniqueSources : undefined 
  };
};