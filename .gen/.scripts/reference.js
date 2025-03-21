import fs from "fs";
import Handlebars from "handlebars";
import OpenAI from "openai";
import kb from "../in/kb/kb.json" assert { type: "json" };
import { complete, jsonWriterInstructions } from "./openai.js";

async function writeFile(entity) {
  const entityData = kb.entities.find((e) => e.name == entity);

  const templates = ["reference_description_prompt.hbs"];

  let templateData = {};
  for (let index = 0; index < templates.length; index++) {
    const templatePath = templates[index];

    const source = fs.readFileSync(
      `./.gen/in/templates/${templatePath}`,
      "utf-8"
    );
    const template = Handlebars.compile(source);

    const prompt = template({
      record: {
        name: entityData.name,
      },
    });

    fs.writeFileSync(
      `./.gen/out/${entityData.name.toLocaleLowerCase()}_${templatePath}.txt`,
      prompt
    );

    const responseJSON = await complete({
      instructions: jsonWriterInstructions,
      input: prompt,
    });

    fs.writeFileSync(
      `./.gen/out/${entityData.name.toLocaleLowerCase()}_${templatePath}_response.txt`,
      responseJSON
    );
    const response = JSON.parse(responseJSON);
    templateData = { ...templateData, ...response };

    fs.writeFileSync(
      `./.gen/out/${entityData.name.toLocaleLowerCase()}_data.json`,
      JSON.stringify(templateData)
    );
  }

  return;

  const referenceTemplateSource = fs.readFileSync(
    "./.gen/in/templates/reference_mdx.hbs",
    "utf-8"
  );

  const referenceTemplate = Handlebars.compile(referenceTemplateSource);
  const promptTemplate = Handlebars.compile(promptTemplateSource);

  const prompt = promptTemplate({
    record: {
      name: entityData.name,
    },
  });

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}_prompt.txt`,
    prompt
  );

  const responseJSON = await complete({
    instructions: jsonWriterInstructions,
    input: prompt,
  });

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}_response.txt`,
    responseJSON
  );

  const response = JSON.parse(responseJSON);
  const contents = referenceTemplate({
    record: {
      name: entityData.name,
      description: "Product description",
    },
    response,
  });

  fs.writeFile(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}.mdx`,
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

writeFile("Product");
