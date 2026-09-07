/**
 * Usage:
 *   npx hardhat run scripts/register.js --network localhost -- <filePath> [label] [sourceUrl]
 *
 * Hashes a local file (sha256) and registers that fingerprint on-chain via
 * ProvenanceRegistry.registerContent(). This is step "hash → upload" of the
 * pipeline: you own the file, you fingerprint it, you commit the fingerprint
 * on-chain so it can be checked for tampering later.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const hre = require("hardhat");

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return "0x" + hash; // bytes32-compatible hex string
}

async function main() {
  const args = process.argv.slice(2);
  // hardhat run swallows some args; grab everything after the script name that isn't a hardhat flag
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.error("Usage: npx hardhat run scripts/register.js --network localhost -- <filePath> [label] [sourceUrl]");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  const label = args[1] && !args[1].startsWith("--") ? args[1] : path.basename(filePath);
  const sourceUrl = args[2] && !args[2].startsWith("--") ? args[2] : "";

  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const contentHash = sha256File(filePath);
  console.log("File:", filePath);
  console.log("SHA-256 fingerprint:", contentHash);

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("deployment.json not found. Run scripts/deploy.js first.");
    process.exit(1);
  }
  const { address } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const registry = await hre.ethers.getContractAt("ProvenanceRegistry", address);

  const tx = await registry.registerContent(contentHash, label, sourceUrl);
  const receipt = await tx.wait();

  console.log("Registered on-chain.");
  console.log("Tx hash:", receipt.hash);
  console.log("Label:", label);
  if (sourceUrl) console.log("Source URL:", sourceUrl);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
