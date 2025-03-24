import fs from 'fs';
import Handlebars from 'handlebars';
import kb from '../in/kb/kb.json' assert { type: 'json' };
import { complete } from './openai.js';

async function getCompletion(templatePath, entityData, templateData) {
  const source = fs.readFileSync(
    `./.gen/in/templates/${templatePath}`,
    'utf-8'
  );
  const template = Handlebars.compile(source);

  const prompt = template(templateData);

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}/${templatePath}.txt`,
    prompt
  );

  const responseJSON = await complete({
    input: prompt,
  });

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}/${templatePath}_response.txt`,
    responseJSON
  );
  const response = JSON.parse(responseJSON);

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}/data.json`,
    JSON.stringify(response)
  );

  return response;
}

async function writeFile(entity) {
  const entityData = kb.entities.find((e) => e.name == entity);

  let templateData = {
    entityData,
    reference: [],
  };

  //Create directory for entity
  fs.promises.mkdir(`./.gen/out/${entityData.name.toLocaleLowerCase()}`, {
    recursive: true,
  });

  // Introduction
  const introData = await getCompletion(
    'reference_description_prompt.hbs',
    entityData,
    entityData
  );
  templateData = { ...templateData, ...introData };

  //All fields
  // await getCompletion('reference_all_fields_prompt.hbs', entityData, {
  //   ...entityData,
  //   tabFiles: entityData.frontEndFiles.map((file) => ({
  //     name: file.name,
  //     contents: fs.readFileSync(`${kb.paths.frontend}${file.path}`, 'utf-8'),
  //   })),
  // });

  //Fields reference
  for (let index = 0; index < entityData.frontEndFiles.length; index++) {
    const file = entityData.frontEndFiles[index];

    const fieldData = await getCompletion(
      'reference_fields_prompt.hbs',
      entityData,
      {
        name: file.name,
        contents: fs.readFileSync(`${kb.paths.frontend}${file.path}`, 'utf-8'),
      }
    );

    templateData.reference = templateData.reference.concat(fieldData.reference);
  }

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}/data.json`,
    JSON.stringify(templateData)
  );

  // Render the final MDX file
  const referenceTemplateSource = fs.readFileSync(
    './.gen/in/templates/reference_mdx.hbs',
    'utf-8'
  );

  const referenceTemplate = Handlebars.compile(referenceTemplateSource);

  const contents = referenceTemplate(templateData);

  fs.writeFileSync(
    `./.gen/out/${entityData.name.toLocaleLowerCase()}/${entityData.name.toLocaleLowerCase()}.mdx`,
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
