/**
 * AI Configuration
 * Centralized configuration for Lovable Cloud AI models
 */

export const AI_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
  { id: "openai/gpt-5", name: "GPT-5" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
] as const;

// Default model per Lovable AI docs
export const DEFAULT_AI_MODEL = "openai/gpt-5-mini";

// LocalStorage key for model preference
export const MODEL_PREFERENCE_KEY = "ai-model-preference";

// Chat API endpoint
export const getChatEndpoint = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
