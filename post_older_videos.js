import "dotenv/config";
import fetch from "node-fetch";
import fs from "fs";

const {
  FB_PAGE_ID,
  FB_PAGE_TOKEN,
} = process.env;

const videos = JSON.parse(fs.readFileSync("videos.json", "utf-8")).items;
const posted = JSON.parse(fs.readFileSync("posted.json", "utf-8"));

const postedIds = new Set(posted.postedVideoIds);

// sort ASC (oldest → newest)
videos.sort(
  (a, b) =>
    new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt)
);
// pick next unposted
const nextVideo = videos.find(
  (v) => !postedIds.has(v.id.videoId)
);

if (!nextVideo) {
  console.log("No new videos to post");
  process.exit(0);
}

function decodeHtmlEntities(str = "") {
  return str.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCharCode(dec)
  ).replace(/&amp;/g, "&")
   .replace(/&lt;/g, "<")
   .replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"')
   .replace(/&#39;/g, "'");
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
  const upload = async () => {
    const video_url = `https://www.youtube.com/watch?v=${videoId}`;
    const decodedTitle = decodeHtmlEntities(title);
    const decodedDescription = decodeHtmlEntities(description);
    const body = new URLSearchParams({
      message: `${decodedTitle}\n\n${decodedDescription}`,
      link: video_url,
      published: "true",
      privacy: JSON.stringify({ value: "EVERYONE" }),
      access_token: FB_PAGE_TOKEN,
    });

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


const videoId = nextVideo.id.videoId;
const url = `https://www.youtube.com/watch?v=${videoId}`;

console.log("Posting:", url);

// 👉 call your FB post function here
await postToFacebook(videoId, nextVideo.snippet.title, nextVideo.snippet.description);

// update state
posted.postedVideoIds.push(videoId);
fs.writeFileSync("posted.json", JSON.stringify(posted, null, 2));

console.log("Stored video ID:", videoId);