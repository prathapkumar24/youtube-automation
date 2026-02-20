//import "dotenv/config";
import fetch from "node-fetch";
import { YtDlp } from "ytdlp-nodejs";
import fs from "fs";
import FormData from "form-data";
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

async function deleteVideo(videoId) {
  // 2️⃣ Delete the downloaded video file
  const filePath = path.resolve(`video-${videoId}.mp4`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted local video file: ${filePath}`);
    } catch (err) {
      console.error(`Failed to delete file ${filePath}:`, err.message);
    }
  }
}

async function getLatestVideo() {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&order=date&maxResults=1&type=video&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  return data.items[0];
}

async function downloadVideo(videoId) {
  if (isAlreadyUploaded(videoId)) {
    console.log(`Video ${videoId} already uploaded. Skipping...`);
    process.exit(0); // stop script
  }
  const ytdlp = new YtDlp();
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const outputFile = path.resolve(`video-${videoId}.mp4`);

  await ytdlp.download(url, {
    output: outputFile,
    format: "mp4",
  });

  // Mark as uploaded
  await markAsUploaded(videoId);  
  return outputFile;
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

export async function uploadToFacebook(filePath, title, description) {
  const upload = async () => {
    const form = new FormData();
    
    // Fix 1: Convert local file to a Blob for compatibility with built-in FormData
    //const videoBlob = await openAsBlob(filePath);
    form.append("source", fs.createReadStream(filePath));
    form.append("description", `${title}\n\n${description}`);
    form.append("access_token", FB_PAGE_TOKEN);

    // Fix 2: Use graph-video.facebook.com for video uploads
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${FB_PAGE_ID}/videos`,
      {
        method: "POST",
        body: form,
        // Note: 'timeout' is not a standard option for native fetch; 
        // use AbortController if you need a timeout.
      }
    );

    const data = await res.json();
    
    if (!res.ok) {
        console.log(data);
       // Facebook error data is usually inside data.error
       const errorMsg = data.error?.message || JSON.stringify(data);
       throw new Error(`Upload failed: ${errorMsg}`);
    }

    return data;
  };

  try {
    const result = await retry(upload, 1, 3000);
    console.log("Video uploaded successfully:", result);
    return result;
  } catch (err) {
    console.error("Failed to upload video:", err.message);
    throw err;
  }
}

(async () => {
  const video = await getLatestVideo();
  const videoId = video.id.videoId;
  const title = video.snippet.title;
  const description = video.snippet.description;

  const file = await downloadVideo(videoId);
  await uploadToFacebook(file, title, description);
  await deleteVideo(videoId);
})();