import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export type ModelProvider = "groq" | "cohere";

interface ModelSelection {
  model: any;
  provider: ModelProvider;
}

function getAvailableModels(): ModelSelection[] {
  const models: ModelSelection[] = [];

  const groqKey = process.env.GROQ_API_KEY;
  const cohereKey = process.env.COHERE_API_KEY;

  if (groqKey) {
    const provider = createOpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
    models.push({
      model: provider("llama-3.3-70b-versatile"),
      provider: "groq",
    });
  }

  if (cohereKey) {
    models.push({
      model: cohereKey,
      provider: "cohere",
    });
  }

  return models;
}

async function runCohereNative(prompt: string, apiKey: string) {
  const resp = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command-r-plus",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Cohere API error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data.message?.content?.[0]?.text ?? "";
}

async function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
      (res) => {
        clearTimeout(id);
        resolve(res);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      }
    );
  });
}

export async function runWithFailover(
  prompt: string
): Promise<{ text: string; provider: ModelProvider }> {
  const models = getAvailableModels();

  if (models.length === 0) {
    throw new Error(
      "No LLM API key found. Set GROQ_API_KEY, COHERE_API_KEY, or OPENAI_API_KEY."
    );
  }

  for (const { model, provider } of models) {
    try {
      let text: string;

      if (provider === "cohere") {
        text = await withTimeout(runCohereNative(prompt, model));
      } else {
        const result = await generateText({
          model,
          prompt,
          temperature: 0,
        });
        text = result.text;
      }

      if (text && text.trim().length > 0) {
        return { text, provider };
      } else {
        throw new Error(`Empty response from ${provider}`);
      }
    } catch (err: any) {
      console.error(`❌ ${provider} failed:`, err.message);
    }
  }

  throw new Error("All available LLM providers failed.");
}
