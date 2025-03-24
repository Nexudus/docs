import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Uploads the given file to Gemini.
 *
 * See https://ai.google.dev/gemini-api/docs/prompting_with_media
 */
async function uploadToGemini(path, mimeType) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

/**
 * Waits for the given files to be active.
 */
async function waitForFilesActive(files) {
  console.log("Waiting for file processing...");
  for (const name of files.map((file) => file.name)) {
    let file = await fileManager.getFile(name);
    while (file.state === "PROCESSING") {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(name);
    }
    if (file.state !== "ACTIVE") {
      throw Error(`File ${file.name} failed to process`);
    }
  }
  console.log("...all files ready\n");
}
const sharedInstructions = fs.readFileSync("./.gen/in/guides_instructions.txt");

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: sharedInstructions,
});

const generationConfig = {
  temperature: 0,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step_title: {
              type: "string",
            },
            step_start_time: {
              type: "string",
            },
            step_duration: {
              type: "number",
            },
            sub_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_description_markdown: {
                    type: "string",
                  },
                  sub_step_start_time: {
                    type: "string",
                  },
                  sub_step_duration: {
                    type: "number",
                  },
                },
                required: [
                  "step_description_markdown",
                  "sub_step_start_time",
                  "sub_step_duration",
                ],
              },
            },
          },
          required: [
            "step_title",
            "step_start_time",
            "step_duration",
            "sub_steps",
          ],
        },
      },
      introduction_markdown: {
        type: "string",
      },
      title: {
        type: "string",
      },
      description: {
        type: "string",
      },
    },
    required: ["steps", "introduction_markdown", "title", "description"],
  },
};

export async function complete({ input, videoPath }) {
  const files = [await uploadToGemini(videoPath, "video/mp4")];

  // Some files have a processing delay. Wait for them to be ready.
  await waitForFilesActive(files);

  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: files[0].mimeType,
              fileUri: files[0].uri,
            },
          },
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage(input);
  return JSON.parse(result.response.text());
}
