const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const ProvenanceRegistry = await hre.ethers.getContractFactory("ProvenanceRegistry");
  const registry = await ProvenanceRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("ProvenanceRegistry deployed to:", address);

  // Save the address so the other scripts can pick it up automatically.
  const deploymentInfo = {
    address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Saved deployment info to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
