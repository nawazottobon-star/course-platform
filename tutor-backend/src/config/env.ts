import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4001),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, { message: "JWT_SECRET must be at least 32 characters" }),
    JWT_REFRESH_SECRET: z.string().min(32, { message: "JWT_REFRESH_SECRET must be at least 32 characters" }),
    JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    FRONTEND_APP_URLS: z.string().default("http://localhost:5174"),
    OPENAI_API_KEY: z.string().min(1, { message: "OPENAI_API_KEY is required" }),
    LLM_MODEL: z.string().min(1).default("gpt-3.5-turbo"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
    throw new Error("Failed to parse environment variables");
}

const frontendAppUrls = parsed.data.FRONTEND_APP_URLS.split(",").map((url) => url.trim()).filter(Boolean);
const primaryFrontendUrl = frontendAppUrls[0] ?? "http://localhost:5174";

export const env = {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    jwtSecret: parsed.data.JWT_SECRET,
    jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
    jwtAccessTokenTtlSeconds: parsed.data.JWT_ACCESS_TOKEN_TTL_SECONDS,
    jwtRefreshTokenTtlDays: parsed.data.JWT_REFRESH_TOKEN_TTL_DAYS,
    frontendAppUrl: primaryFrontendUrl,
    frontendAppUrls,
    openAiApiKey: parsed.data.OPENAI_API_KEY,
    llmModel: parsed.data.LLM_MODEL,
};
