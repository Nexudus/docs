import fs from "fs";
import Handlebars from "handlebars";
import kb from "../in/kb/kb.json" assert { type: "json" };
import { complete } from "./gemini.js";
import { extractFrames } from "./ffmpeg.js";

Handlebars.registerHelper("inc", function (value, options) {
  return parseInt(value) + 1;
});

async function getCompletion(templatePath, guideData, templateData) {
  // Read prompt template
  const source = fs.readFileSync(
    `./.gen/in/templates/${templatePath}`,
    "utf-8"
  );

  // Run prompt template
  const template = Handlebars.compile(source);
  const prompt = template(templateData);

  const outputDir = `./.gen/out/${
    guideData.namespace
  }/${guideData.name.toLocaleLowerCase()}`;
  const jsonOutputPath = `${outputDir}/${templatePath}_response.json`;

  // if we have already completed this prompt, reuse it.
  if (fs.existsSync(jsonOutputPath))
    return JSON.parse(fs.readFileSync(jsonOutputPath));

  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(`${outputDir}/${templatePath}.txt`, prompt);

  const response = await complete({
    input: prompt,
    videoPath: `./.gen/in/guides/${guideData.namespace}/${guideData.name}.mp4`,
  });

  fs.writeFileSync(jsonOutputPath, JSON.stringify(response));
  return response;
}

async function writeFile(entity) {
  const guideData = kb.guides.find((e) => e.name == entity);

  if (!guideData) {
    console.clear();
    console.warn(`❌ Could not find ${entity} in kb.json`);
    return;
  }

  const infoFilePath = `./.gen/in/guides/${guideData.namespace}/${guideData.name}.md`;
  if (!fs.existsSync(infoFilePath)) {
    console.clear();
    console.warn(`❌ Could not find summary MD file in ${infoFilePath}`);
    return;
  }
  let templateData = {
    guideData,
    content: fs.readFileSync(infoFilePath),
  };

  //Create directory for entity
  fs.promises.mkdir(
    `./.gen/out/guides/${
      guideData.namespace
    }/${guideData.name.toLocaleLowerCase()}`,
    {
      recursive: true,
    }
  );

  // Introduction
  const introData = await getCompletion(
    "guide_prompt.hbs",
    guideData,
    templateData
  );
  templateData = { ...templateData, ...introData };

  await extractFrames(guideData);

  // Render the final MDX file
  const guideTemplateSource = fs.readFileSync(
    "./.gen/in/templates/guide_mdx.hbs",
    "utf-8"
  );

  const referenceTemplate = Handlebars.compile(guideTemplateSource);
  const contents = referenceTemplate(templateData);

  const outputDir = `./.gen/out/${guideData.namespace.toLocaleLowerCase()}`;
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    `${outputDir}/${guideData.name}/page.mdx`,
    contents,
    (err) => {
      if (err) {
        return console.error(
          `Autsch! Failed to store template: ${err.message}.`
        );
      }
    }
  );
}

const params = process.argv.slice(2);
writeFile(params[0]);
