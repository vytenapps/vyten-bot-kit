export const AI_MODELS = [
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini" },
  { id: "openai/gpt-5", name: "GPT-5" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
] as const;

export const DEFAULT_AI_MODEL = "openai/gpt-5-mini";

export const getStoredModel = (): string => {
  return localStorage.getItem("preferred_ai_model") || DEFAULT_AI_MODEL;
};

export const setStoredModel = (model: string): void => {
  localStorage.setItem("preferred_ai_model", model);
};
