import OpenAI from "openai";
import { env } from "../config/env";

const client = new OpenAI({ apiKey: env.openAiApiKey });

async function runChatCompletion(options: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
}): Promise<string> {
    const completion = await client.chat.completions.create({
        model: env.llmModel,
        temperature: options.temperature ?? 0.2,
        messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.userPrompt },
        ],
        max_tokens: options.maxTokens ?? 500,
    });

    const message = completion.choices[0]?.message?.content?.trim();
    if (!message) {
        throw new Error("OpenAI did not return a chat completion");
    }
    return message;
}

export async function generateTutorCopilotAnswer(prompt: string): Promise<string> {
    return runChatCompletion({
        systemPrompt:
            "You are MetaLearn's tutor analytics copilot. Use only the provided learner roster and stats. Call out concrete numbers, " +
            "flag at-risk learners, and keep responses concise (3-5 sentences). If information is missing, say so directly.",
        userPrompt: prompt,
        temperature: 0.15,
    });
}
