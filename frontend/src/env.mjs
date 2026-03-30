import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default("http://localhost:8009/api/v1"),
  NEXT_PUBLIC_REVERB_APP_KEY: z.string().min(1).default("reachable-app-key"),
  NEXT_PUBLIC_REVERB_HOST: z.string().min(1).default("localhost"),
  NEXT_PUBLIC_REVERB_PORT: z.coerce.number().int().positive().default(8080),
  NEXT_PUBLIC_REVERB_SCHEME: z.enum(["http", "https"]).default("http"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_REVERB_APP_KEY: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
  NEXT_PUBLIC_REVERB_HOST: process.env.NEXT_PUBLIC_REVERB_HOST,
  NEXT_PUBLIC_REVERB_PORT: process.env.NEXT_PUBLIC_REVERB_PORT,
  NEXT_PUBLIC_REVERB_SCHEME: process.env.NEXT_PUBLIC_REVERB_SCHEME,
});

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.format());
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
