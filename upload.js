//import "dotenv/config";
import fetch from "node-fetch";
import { YtDlp } from "ytdlp-nodejs";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { spawn } from 'child_process';

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
  /*const options = {
      cookies: process.env.COOKIE_PATH || './cookies.txt',
      noCacheDir: true,
      verbose: true,              // Enables yt-dlp internal debug logs
      debugPrintCommandLine: true // Shows the exact command being run
  };
  try {
    const info = await ytdlp.getInfoAsync(url, options);
      console.log("Success!");
  } catch (err) {
      console.error("Debug Error:", err);
  }
  const cookiesPath = "./cookies.txt";

  const cookies = fs.readFileSync(cookiesPath, "utf8");
  console.log("===== cookies.txt =====");
  console.log(cookies);
  console.log("=======================");
  return;
  */
  /*const options = {
      cookies: process.env.COOKIE_PATH || './cookies.txt',
      format: "mp4",
      noCacheDir: true,
      output: outputFile,
      verbose: true,              // Enables yt-dlp internal debug logs
      debugPrintCommandLine: true // Shows the exact command being run
  };
  await ytdlp.download(url, options);*/

try {
  await runYtDlpDownload(url, outputFile);
  console.log('Download completed');
} catch (err) {
  console.error('Download failed:\n', err.message);
}

  // Mark as uploaded
  await markAsUploaded(videoId);  
  return outputFile;
  /*const COOKIE = '__Secure-1PAPISID=Kd4NDthuavsDKvb_/ApjfhpoD_ygFr4U4m; __Secure-1PSID=g.a0006whyUT5QjGclcohR-PDmec9udUL_VJUrgQkK1KmfPhid-5PxL3m83xGlPOJkfEhX9kcDDAACgYKATgSARYSFQHGX2Midv6TVuk2JVHIQ6tXbvYrGRoVAUF8yKoBMwkbzL8cQl8Cg3rthkog0076; __Secure-1PSIDCC=AKEyXzVIrVrJBP7FWRI76VI6rap6DN-TyFBfBIgEcVoP-gEVb_cPk2yNr6_7hGHpJuOEP1CSTiY; __Secure-1PSIDTS=sidts-CjQBBj1CYs9VUXG4gI0SpmAj4g3EEI4jg9U7Pcm0WdTGKnsrlI1DObaS0BuxxsnZ1jCPqdtfEAA; __Secure-3PAPISID=Kd4NDthuavsDKvb_/ApjfhpoD_ygFr4U4m; __Secure-3PSID=g.a0006whyUT5QjGclcohR-PDmec9udUL_VJUrgQkK1KmfPhid-5PxskkIobVLMEAHt-jARectGAACgYKAcMSARYSFQHGX2MiqUJeqHGHY65j_c_9QSTJmxoVAUF8yKpobWjKSGALeKPaNCGtmhOq0076; __Secure-3PSIDCC=AKEyXzUcOsz4HYiXDgqg1eH9GinD_6kymSCYL2jE8kmgHYDCZ1e_Ci20yzVb9U6dddsPhnmkBd0; __Secure-3PSIDTS=sidts-CjQBBj1CYs9VUXG4gI0SpmAj4g3EEI4jg9U7Pcm0WdTGKnsrlI1DObaS0BuxxsnZ1jCPqdtfEAA; __Secure-ROLLOUT_TOKEN=CNTOsIa1jpr0MBDiiNzu-_aKAxj42OWG2PGSAw%3D%3D; __Secure-YNID=16.YT=DvweXKFiAQDCJ55v8szt78slK4YwuvGoy_eRNbi7y0yJSBBPegNbaZqhn6WmNowziUDqRJ18F-EeZXEgpVGXQHnL9x-ym0vz3NcEZEUbUQOODvg5LHIfEdxDukgDMhi8AIk2KNgXcBQf2oNrOd0veAIc4xJT8JVWeMoghf3ttKA2lQBAx9uCIUl9aQ9BzSTf4wEB_kRZhqI2hEA5P7QCEGCQmrwQFuO9aC7bsSckOIAnYijYe8UVkcFloB9RY5LXGVxijEgOgXtCxSIDLWCVXjy24kClDxI3WVbZfNz26ITK9ao_o9uTPBY11WW-WkwsxX82m_3-n-ZHS83vWU3YKw; APISID=jZhs9HPIs1JVNiaw/AvPbB2S468jths_yL; HSID=A0k-GHUxb9cKBBg3Y; LOGIN_INFO=AFmmF2swRAIgMf7rslFZEtXxbLMmZvJDqccvci81fa6GXKdpPIX0l10CIBHWBUeoI0W6r4ITYL_bRZ4wV_6PjwSxtrE6BGXJ-v0p:QUQ3MjNmejhLdjdaMWdueks5ZWJwcDFQRVBqYnhnM0VwV3ZRZEVVajBNSWlXUmYxYlFZZEhjLVBiN3lPaTJuMVozQ2xocU9CUkxyVkpUUGRRbXB5amh0LW5ZTUM0aWJoSWJCMVhEX2oyOGplS1IyamlCLU9zOWxWakYzcFpFV0piQk0wQXZFRHBOYXNqSU8xd3VrWjFQLUpuSFNzUGdRVk1B; PREF=f4=4000000&tz=Asia.Calcutta&f7=100; SAPISID=Kd4NDthuavsDKvb_/ApjfhpoD_ygFr4U4m; SID=g.a0006whyUT5QjGclcohR-PDmec9udUL_VJUrgQkK1KmfPhid-5Pxh5nUa24sU0uyhIzPiFtWuwACgYKARkSARYSFQHGX2MiaH7VxO5SemTRsvkPAKX98RoVAUF8yKqvBGj-ySIQOmMEXR9tItl80076; SIDCC=AKEyXzV1pz3aD9ACsgCiDRDDSXNYrPmmv6gHZbeQr8makX9ijZSknXOuHGUe48HgXO6J1EgeoDc; SSID=Auv13vBfcsAN4bm7l; VISITOR_INFO1_LIVE=yasP3l7YXWk; VISITOR_PRIVACY_METADATA=CgJJThIEGgAgKQ%3D%3D; YSC=B7t4w9klGIg';
  const outputName = `video-${videoId}.mp4`;
  const outputPath = path.resolve(outputName);
  const video = ytdl(videoId, {
    requestOptions: {
      headers: {
        cookie: COOKIE,
        // Optional. If not given, ytdl-core will try to find it.
        // You can find this by going to a video's watch page, viewing the source,
        // and searching for "ID_TOKEN".
        // 'x-youtube-identity-token': 1324,
      },
    },
  });
  video.on('info', info => {
    console.log('title:', info.videoDetails.title);
    console.log('rating:', info.player_response.videoDetails.averageRating);
    console.log('uploaded by:', info.videoDetails.author.name);
  });

  video.on('progress', (chunkLength, downloaded, total) => {
    const percent = downloaded / total;
    console.log('downloading', `${(percent * 100).toFixed(1)}%`);
  });

  video.on('end', () => {
    console.log('saved to', outputName);
  });

  video.pipe(fs.createWriteStream(outputPath));*/
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

function runYtDlpDownload(url, outputFile) {
  return new Promise((resolve, reject) => {
    // Force yt-dlp to use Node.js for JS challenges
    process.env.YTDLP_JSC = 'NODE';

    const args = [
      '--js-runtime', 'node',
      '--cookies', process.env.COOKIE_PATH || './cookies.txt',

      // format selection (closest equivalent to format: "mp4")
      '-f', 'bv*[ext=mp4]+ba/b[ext=mp4]/best',

      '--merge-output-format', 'mp4',
      '--no-cache-dir',
      '-o', outputFile,
      '-v', // verbose
      url
    ];

    console.log('Running: yt-dlp', args.join(' '));

    const p = spawn('yt-dlp', args, { env: process.env });

    p.stdout.on('data', d => {
      console.log(d.toString());
    });

    p.stderr.on('data', d => {
      console.error(d.toString());
    });

    p.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

(async () => {
  const video = await getLatestVideo();
  const videoId = video.id.videoId;
  const title = video.snippet.title;
  const description = video.snippet.description;

  const file = await downloadVideo(videoId);
  //await uploadToFacebook(file, title, description);
  //await deleteVideo(videoId);
})();