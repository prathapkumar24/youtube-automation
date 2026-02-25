import "dotenv/config";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const {
  YOUTUBE_API_KEY,
  YOUTUBE_CHANNEL_ID,
  FB_PAGE_ID,
  FB_PAGE_TOKEN,
} = process.env;

// File to track uploaded videos
const uploadedFile = path.resolve("uploaded.txt");

// Helper: check if video ID exists
function isAlreadyUploaded(videoId) {
  if (!fs.existsSync(uploadedFile)) return false;
  const uploadedIds = fs.readFileSync(uploadedFile, "utf-8").split("\n");
  return uploadedIds.includes(videoId);
}

// Helper: append new video ID
async function markAsUploaded(videoId) {
  fs.appendFileSync(uploadedFile, videoId + "\n");
}


async function getLatestVideo() {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&order=date&maxResults=1&type=video&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  return data.items[0];
}


// Retry helper
async function retry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retrying upload... attempt ${i + 1}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function postToFacebook(videoId, title, description) {
  if (isAlreadyUploaded(videoId)) {
    console.log(`Video ${videoId} already uploaded. Skipping...`);
    process.exit(0); // stop script
  }
  const upload = async () => {
    const video_url = `https://www.youtube.com/watch?v=${videoId}`;

    const body = new URLSearchParams({
      message: `${title}\n\n${description}`,
      link: video_url,
      published: "true",
      access_token: FB_PAGE_TOKEN,
    });

    // Fix 2: Use graph-video.facebook.com for video uploads
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${FB_PAGE_ID}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await res.json();
    
    if (!res.ok) {
        console.log(data);
       // Facebook error data is usually inside data.error
       const errorMsg = data.error?.message || JSON.stringify(data);
       throw new Error(`Upload failed: ${errorMsg}`);
    }
    await markAsUploaded(videoId);
    return data;
  };

  try {
    const result = await retry(upload, 3, 3000);
    console.log("Posted successfully:", result);
    return result;
  } catch (err) {
    console.error("Failed to post:", err.message);
    throw err;
  }
}



(async () => {
  const video = await getLatestVideo();
  const videoId = video.id.videoId;
  const title = video.snippet.title;
  const description = video.snippet.description;

  await postToFacebook(videoId, title, description);
})();