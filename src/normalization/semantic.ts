import {
  SemanticAIProvider,
  SemanticFieldConfig,
  SemanticFieldMeta,
  SemanticNormalizationResult,
  SemanticNormalizeOptions,
} from '../types';

interface ResolvedFieldDefinition {
  key: string;
  description: string;
  fallbackPaths: string[];
}

interface AIExtractionCandidate {
  key: string;
  value: unknown;
  sourceField?: string;
  confidence?: number;
  reasoning?: string;
}

function readPath(payload: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[key];
  }, payload as any);
}

function toFieldDefinition(key: string, config: string | SemanticFieldConfig): ResolvedFieldDefinition {
  if (typeof config === 'string') {
    return {
      key,
      description: config,
      fallbackPaths: [],
    };
  }

  const fallback = config.fallback
    ? (Array.isArray(config.fallback) ? config.fallback : [config.fallback])
    : [];

  return {
    key,
    description: config.description || key,
    fallbackPaths: fallback,
  };
}

function parseJSONResponse(content: string): AIExtractionCandidate[] {
  const clean = content.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
  const parsed = JSON.parse(clean) as { fields?: AIExtractionCandidate[] };
  return parsed.fields || [];
}

async function extractWithProvider(
  provider: SemanticAIProvider,
  fields: ResolvedFieldDefinition[],
  payload: unknown,
): Promise<AIExtractionCandidate[] | null> {
  const prompt = `Extract semantic webhook fields from a raw payload.\nReturn strict JSON with shape: {"fields":[{"key":"...","value":...,"sourceField":"dot.path","confidence":0-1,"reasoning":"..."}]}.\nOnly include keys requested below.\nRequested fields: ${JSON.stringify(fields)}\nPayload: ${JSON.stringify(payload)}`;

  try {
    const { generateText } = await loadModule<any>('ai');

    if (provider === 'groq' && process.env.GROQ_API_KEY) {
      const { createGroq } = await loadModule<any>('@ai-sdk/groq');
      const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
      const output = await generateText({ model: groq('llama-3.1-8b-instant'), prompt });
      return parseJSONResponse(output.text);
    }

    if (provider === 'cohere' && process.env.COHERE_API_KEY) {
      const { createCohere } = await loadModule<any>('@ai-sdk/cohere');
      const cohere = createCohere({ apiKey: process.env.COHERE_API_KEY });
      const output = await generateText({ model: cohere('command-r-plus'), prompt });
      return parseJSONResponse(output.text);
    }

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const { createOpenAI } = await loadModule<any>('@ai-sdk/openai');
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const output = await generateText({ model: openai('gpt-4o-mini'), prompt });
      return parseJSONResponse(output.text);
    }

    if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      const { createAnthropic } = await loadModule<any>('@ai-sdk/anthropic');
      const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const output = await generateText({ model: anthropic('claude-3-5-haiku-latest'), prompt });
      return parseJSONResponse(output.text);
    }

    if (provider === 'google' && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const { createGoogleGenerativeAI } = await loadModule<any>('@ai-sdk/google');
      const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
      const output = await generateText({ model: google('gemini-1.5-flash'), prompt });
      return parseJSONResponse(output.text);
    }
  } catch {
    return null;
  }

  return null;
}

async function loadModule<TModule>(moduleName: string): Promise<TModule> {
  const dynamicImporter = new Function('moduleName', 'return import(moduleName);') as (name: string) => Promise<TModule>;
  return dynamicImporter(moduleName);
}

export async function runSemanticNormalization(
  payload: unknown,
  options: SemanticNormalizeOptions,
): Promise<SemanticNormalizationResult> {
  const definitions = Object.entries(options.fields).map(([key, value]) => toFieldDefinition(key, value));
  const preferredProviders = options.ai?.providers || ['groq', 'cohere', 'openai', 'anthropic', 'google'];
  const minimumConfidence = options.ai?.minimumConfidence ?? 0.7;

  let extractedByAI: AIExtractionCandidate[] = [];

  if (options.ai?.enabled !== false) {
    for (const provider of preferredProviders) {
      const extracted = await extractWithProvider(provider, definitions, payload);
      if (extracted && extracted.length > 0) {
        extractedByAI = extracted;
        break;
      }
    }
  }

  const fields: Record<string, unknown> = {};
  const meta: Record<string, SemanticFieldMeta> = {};
  const payloadObj = (payload && typeof payload === 'object') ? payload as Record<string, any> : {};

  for (const definition of definitions) {
    const aiMatch = extractedByAI.find((entry) => entry.key === definition.key);
    const confidence = aiMatch?.confidence ?? 0;

    if (aiMatch && aiMatch.value !== undefined && confidence >= minimumConfidence) {
      fields[definition.key] = aiMatch.value;
      meta[definition.key] = {
        source: 'ai',
        sourceField: aiMatch.sourceField,
        confidence,
        reasoning: aiMatch.reasoning,
      };
      continue;
    }

    let resolvedFallback: unknown;
    let resolvedPath: string | undefined;
    for (const path of definition.fallbackPaths) {
      const candidate = readPath(payloadObj, path);
      if (candidate !== undefined) {
        resolvedFallback = candidate;
        resolvedPath = path;
        break;
      }
    }

    if (resolvedFallback !== undefined) {
      fields[definition.key] = resolvedFallback;
      meta[definition.key] = {
        source: 'manual',
        sourceField: resolvedPath,
        confidence: 1,
      };
      continue;
    }

    fields[definition.key] = null;
    meta[definition.key] = {
      source: 'missing',
      confidence,
      reasoning: aiMatch?.reasoning || 'Field not found in AI extraction or manual fallback paths.',
    };
  }

  return { fields, meta };
}
