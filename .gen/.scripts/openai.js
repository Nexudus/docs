import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

export const jsonWriterInstructions =
  "ALL your responses MUST BE VALID EXCLUSIVELY JSON string. Do not wrap response in markdown syntax";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export const complete = async ({ input, instructions }) => {
  const response = await client.responses.create({
    model: "gpt-4o",
    instructions,
    input,
  });

  return response.output_text.replace("```json", "").replace("```", "");
};
