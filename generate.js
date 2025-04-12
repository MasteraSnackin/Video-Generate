const fetch = require('node-fetch');
const fs = require('fs');
const { LumaAI } = require('lumaai');

// Ensure the API key is provided via environment variable
const apiKey = process.env.LUMAAI_API_KEY;
if (!apiKey) {
    console.error("Error: LUMAAI_API_KEY environment variable is not set.");
    console.error("Please get a key from https://lumalabs.ai/dream-machine/api/keys and set the environment variable.");
    process.exit(1); // Exit if the key is missing
}

const client = new LumaAI({ authToken: apiKey });

async function generateVideo() {
    try {
        console.log("Starting image-to-video generation...");
        let generation = await client.generations.create({
            prompt: "A captivating image of a character dancing joyfully in the rain, set against a moody yet vibrant backdrop. The scene is illuminated by soft, diffused light breaking through stormy clouds, creating a magical atmosphere. The character is dressed in flowing, wet clothing that clings to their form, emphasizing movement and texture. Raindrops splash dynamically around them, with puddles reflecting the muted colours of the sky. Their pose is graceful and expressive, arms outstretched and feet mid-step as they twirl or leap with abandon. The environment is rich with detail—perhaps a cobblestone street or a lush grassy field—with water droplets glistening on surfaces. The mood is uplifting and cinematic, evoking freedom and connection to nature. Style: hyper-realistic or painterly (depending on preference), high resolution, intricate detail",
            keyframes: {
              frame0: {
                type: "image",
                url: "https://images.lifestyleasia.com/wp-content/uploads/sites/2/2022/04/28140402/MNT-1600x900.jpg"
              }
            }
            // You can add other options here like model, resolution, duration, etc.
            // model: "ray-2", // Example: Use Ray 2 model
            // resolution: "720p", // Example: Set resolution
            // duration: "5s"
        });

        console.log(`Generation started with ID: ${generation.id}`);
        let completed = false;

        while (!completed) {
            // Add a small delay before polling again to avoid hitting rate limits if any
            await new Promise(r => setTimeout(r, 5000)); // Wait for 5 seconds before checking status

            generation = await client.generations.get(generation.id);
            console.log(`Current generation state: ${generation.state}`);

            if (generation.state === "completed") {
                completed = true;
            } else if (generation.state === "failed") {
                throw new Error(`Generation failed: ${generation.failure_reason || 'Unknown reason'}`);
            } else {
                console.log("Dreaming...");
                // The loop will continue polling after the 5-second delay
            }
        }

        console.log("Generation completed!");

        // Ensure assets and video URL exist
        if (!generation.assets || !generation.assets.video) {
             throw new Error("Generation completed but no video asset found.");
        }
        const videoUrl = generation.assets.video;
        console.log(`Video URL: ${videoUrl}`);

        console.log("Downloading video...");
        const response = await fetch(videoUrl);

        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const fileName = `${generation.id}.mp4`;
        const fileStream = fs.createWriteStream(fileName);

        await new Promise((resolve, reject) => {
            response.body.pipe(fileStream);
            response.body.on('error', (err) => {
                console.error("Error during download stream:", err);
                reject(err);
            });
            fileStream.on('finish', () => {
                console.log("Download stream finished.");
                resolve();
            });
            fileStream.on('error', (err) => {
                 console.error("Error writing file:", err);
                 reject(err);
            });
        });

        console.log(`File downloaded successfully as ${fileName}`);

    } catch (error) {
        console.error("An error occurred:", error.message || error);
        if (error.response && error.response.data) {
             console.error("API Error details:", error.response.data);
        }
    }
}

generateVideo();
