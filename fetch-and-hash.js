/**
 * Usage:
 *   node scripts/fetch-and-hash.js <imageUrl>
 *
 * Downloads a discovered image (e.g. from reverse-search.js results),
 * saves it locally, and prints its sha256 fingerprint so you can pipe it
 * straight into scripts/register.js or scripts/verify.js.
 *
 * Example end-to-end flow:
 *   node scripts/reverse-search.js my-photo.jpg
 *   node scripts/fetch-and-hash.js <one of the matched URLs from above>
 *   npx hardhat run scripts/register.js --network localhost -- downloaded/match.jpg "found post" <url>
 *   npx hardhat run scripts/verify.js --network localhost -- downloaded/match.jpg
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location, destPath).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/fetch-and-hash.js <imageUrl>");
    process.exit(1);
  }

  const downloadDir = path.join(__dirname, "..", "downloaded");
  fs.mkdirSync(downloadDir, { recursive: true });

  const fileName = path.basename(new URL(url).pathname) || `match-${Date.now()}.jpg`;
  const destPath = path.join(downloadDir, fileName);

  console.log("Downloading:", url);
  await download(url, destPath);
  console.log("Saved to:", destPath);

  const hash = sha256File(destPath);
  console.log("SHA-256 fingerprint:", hash);
  console.log("");
  console.log("Now run:");
  console.log(`  npx hardhat run scripts/register.js --network localhost -- "${destPath}" "matched post" "${url}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
