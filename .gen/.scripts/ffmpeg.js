import fs from "fs";
import { exec } from "child_process";

export async function extractFrames(guideData) {
  // Path to your JSON file
  const jsonFilePath = `./.gen/out/${guideData.namespace}/${guideData.name}/guide_prompt.hbs_response.json`;

  // Path to your video file
  const videoFilePath = `./.gen/in/guides/${guideData.namespace}/${guideData.name}.mp4`;

  // Output directory for the frames
  const outputDir = `./images/guides/frames/${guideData.namespace}/${guideData.name}`;

  try {
    // 1. Read and parse the JSON file
    const rawData = fs.readFileSync(jsonFilePath);
    const jsonData = JSON.parse(rawData);

    // 2. Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 3. Iterate through each step in the JSON data
    let step_number = 0;
    let substep_number = 0;
    for (const step of jsonData.steps) {
      //for (const step of step_group.sub_steps) {
      const cropCoordinates = step.video_crop_coordinates;

      // Construct the filename (you can customize this)
      const frameFilename = `${outputDir}/step_${step_number}.png`;
      const gifFileName = `${outputDir}/step_${step_number}.gif`;
      if (fs.existsSync(frameFilename)) {
        fs.unlinkSync(frameFilename);
      }
      if (fs.existsSync(gifFileName)) {
        fs.unlinkSync(gifFileName);
      }
      // Convert timestamp to seconds
      //const timestampSec = timestampMs / 1000;

      const duration = step.step_duration >= 3 ? step.step_duration : 3;
      // Construct the ffmpeg command
      let ffmpegCommandShot = `"./.gen/bin/ffmpeg.exe" -ss ${step.step_start_time} -i "${videoFilePath}" -frames:v 1`;
      let ffmpegCommand = `"./.gen/bin/ffmpeg.exe" -ss ${step.step_start_time} -t ${duration} -i "${videoFilePath}" -vf "fps=10,scale=-2:768:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0`;

      // Add cropping if coordinates are provided
      // if (cropCoordinates && cropCoordinates.length === 4) {
      //   const [x, y, height, width] = cropCoordinates;
      //   ffmpegCommand += ` -vf "crop=${width}:${height}:${x}:${y}"`;
      // }

      ffmpegCommand += ` "${gifFileName}"`;
      ffmpegCommandShot += ` "${frameFilename}"`;

      // 4. Execute the ffmpeg command
      //console.log(`Executing: ${ffmpegCommand}`);
      await executeCommand(ffmpegCommand);
      await executeCommand(ffmpegCommandShot);
      console.log(
        `Frame extracted for step ${step_number + 1}.${substep_number + 1}`
      );

      substep_number++;
      //}
      substep_number = 0;
      step_number++;
    }

    console.log("All frames extracted successfully!");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Helper function to execute shell commands using promises
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`stderr: ${stderr}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

//extractFrames();
