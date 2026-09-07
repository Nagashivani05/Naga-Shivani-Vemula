/**
 * Usage:
 *   npx hardhat run scripts/verify.js --network localhost -- <filePath>
 *
 * Re-hashes a local file and checks whether that fingerprint exists on-chain.
 * If the file has been modified since registration, the new hash will not
 * match anything on-chain, and this will correctly report "NOT VERIFIED".
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const hre = require("hardhat");

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return "0x" + hash;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error("Usage: npx hardhat run scripts/verify.js --network localhost -- <filePath>");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const contentHash = sha256File(filePath);
  console.log("File:", filePath);
  console.log("Current SHA-256 fingerprint:", contentHash);

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  const { address } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const registry = await hre.ethers.getContractAt("ProvenanceRegistry", address);

  const [isVerified, submitter, timestamp, label, sourceUrl] =
    await registry.verifyContent(contentHash);

  console.log("----------------------------------------");
  if (isVerified) {
    const date = new Date(Number(timestamp) * 1000).toISOString();
    console.log("VERIFIED: this exact content is registered on-chain.");
    console.log("Registered by:", submitter);
    console.log("Registered at:", date);
    console.log("Label:", label);
    if (sourceUrl) console.log("Source URL:", sourceUrl);
  } else {
    console.log("NOT VERIFIED: no on-chain record matches this file's current content.");
    console.log("(Either it was never registered, or it has been modified since registration.)");
  }
  console.log("----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
