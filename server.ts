import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to accommodate high-res camera photos
  app.use(express.json({ limit: "50mb" }));

  app.post("/api/extract-ean", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image is required" });
      }

      // Extract the raw base64 data by stripping the Data URL prefix
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: "image/jpeg", // We can default to jpeg, Gemini handles it well
                },
              },
              {
                text: "Você é um assistente especializado em extrair dados de produtos. Olhe para esta imagem (geralmente um screenshot de um app) e encontre o número do 'EAN'. O EAN geralmente tem 13 dígitos. Retorne APENAS os dígitos numéricos do EAN, sem nenhum outro texto, prefixo ou formatação. Se não encontrar o EAN, retorne 'NOT_FOUND'.",
              },
            ],
          },
        ],
        config: {
          temperature: 0, // Deterministic
        },
      });

      const text = response.text?.trim() || "NOT_FOUND";
      
      // Clean up the response to ensure we only have digits
      const digitsOnly = text.replace(/\D/g, "");

      if (digitsOnly.length > 0) {
        res.json({ ean: digitsOnly });
      } else {
        res.json({ ean: null });
      }
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
