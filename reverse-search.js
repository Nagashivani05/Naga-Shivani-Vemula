/**
 * Usage:
 *   node scripts/reverse-search.js <imagePath-or-imageUrl>
 *
 * Performs a genuine reverse-image search for a piece of content YOU OWN
 * (e.g. your own photo, artwork, or a post you published) to find other
 * places it appears on the web. This is the "web search" half of the
 * pipeline. It intentionally does NOT do face recognition or attempt to
 * identify people — it matches an exact/near-duplicate image against
 * public web content, the same category of tool used for copyright and
 * brand-impersonation monitoring.
 *
 * You need an API key for one of these reverse-image-search providers:
 *   - TinEye API           https://api.tineye.com/
 *   - Google Cloud Vision  https://cloud.google.com/vision/docs/detecting-web
 *   - Bing Visual Search   https://www.microsoft.com/en-us/bing/apis/bing-visual-search-api
 *
 * This script is written against the Google Cloud Vision "Web Detection"
 * endpoint, since it's the easiest to get a free-tier key for. Swap the
 * `callVisionApi` function if you'd rather use TinEye or Bing.
 *
 * Set your key as an environment variable before running:
 *   export GOOGLE_VISION_API_KEY=your_key_here
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.GOOGLE_VISION_API_KEY;

function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

function callVisionApi(requestBody) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(requestBody);
    const options = {
      hostname: "vision.googleapis.com",
      path: `/v1/images:annotate?key=${API_KEY}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/reverse-search.js <imagePath-or-imageUrl>");
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("Missing GOOGLE_VISION_API_KEY environment variable.");
    console.error("Get a free-tier key at https://cloud.google.com/vision/docs/setup");
    process.exit(1);
  }

  let image;
  if (isUrl(input)) {
    image = { source: { imageUri: input } };
  } else {
    const filePath = path.resolve(input);
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      process.exit(1);
    }
    const content = fs.readFileSync(filePath).toString("base64");
    image = { content };
  }

  const requestBody = {
    requests: [
      {
        image,
        features: [{ type: "WEB_DETECTION", maxResults: 10 }],
      },
    ],
  };

  console.log("Searching the web for matches to:", input);
  const result = await callVisionApi(requestBody);

  const webDetection = result?.responses?.[0]?.webDetection;
  if (!webDetection) {
    console.log("No web detection results returned.");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const fullMatches = webDetection.fullMatchingImages || [];
  const partialMatches = webDetection.partialMatchingImages || [];
  const pagesWithMatches = webDetection.pagesWithMatchingImages || [];

  console.log(`Found ${fullMatches.length} exact match(es), ${partialMatches.length} partial match(es), on ${pagesWithMatches.length} page(s).`);

  const outputPath = path.join(__dirname, "..", "search-results.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        query: input,
        searchedAt: new Date().toISOString(),
        fullMatches,
        partialMatches,
        pagesWithMatches: pagesWithMatches.map((p) => ({
          url: p.url,
          pageTitle: p.pageTitle,
        })),
      },
      null,
      2
    )
  );
  console.log("Full results saved to search-results.json");
  console.log("");
  console.log("Next step: pick a matching URL and run");
  console.log("  node scripts/fetch-and-hash.js <matchedUrl>");
  console.log("then register/verify that hash on-chain with scripts/register.js.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
