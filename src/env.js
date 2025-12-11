import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url().optional(),
    DIRECT_URL: z.string().url().optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    OPENAI_API_KEY: z.string().optional(),
    TOGETHER_AI_API_KEY: z.string().optional(),
    CEREBRAS_API_KEY: z.string().optional(),
    GOOGLE_AI_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    UNSPLASH_ACCESS_KEY: z.string().optional(),

    // RAG System Configuration
    RAG_MODE: z.enum(["self-hosted", "gemini"]).optional().default("self-hosted"),
    RAG_BACKEND_URL: z.string().url().optional(),



    // Credit system toggle
    ENABLE_CREDIT_SYSTEM: z.string().optional().default("true"),
  },

  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TOGETHER_AI_API_KEY: process.env.TOGETHER_AI_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    RAG_MODE: process.env.RAG_MODE,
    RAG_BACKEND_URL: process.env.RAG_BACKEND_URL,
    ENABLE_CREDIT_SYSTEM: process.env.ENABLE_CREDIT_SYSTEM,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
