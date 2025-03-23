import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

export const complete = async ({ input, instructions = '' }) => {
  const sharedInstructions = fs.readFileSync('./.gen/in/instructions.txt');
  const response = await client.responses.create({
    model: 'gpt-4o',
    instructions: `${sharedInstructions}.\n${instructions}`,
    temperature: 0,
    input,
  });

  return response.output_text.replace('```json', '').replace('```', '');
};
