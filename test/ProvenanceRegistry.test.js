const { expect } = require("chai");
const { ethers } = require("hardhat");
const crypto = require("crypto");

function hashOf(str) {
  return "0x" + crypto.createHash("sha256").update(str).digest("hex");
}

describe("ProvenanceRegistry", function () {
  let registry;

  beforeEach(async function () {
    const Factory = await ethers.getContractFactory("ProvenanceRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  it("registers a new content hash and emits an event", async function () {
    const hash = hashOf("hello world");
    await expect(registry.registerContent(hash, "test-file.txt", "https://example.com/post"))
      .to.emit(registry, "ContentRegistered");
  });

  it("verifies a registered hash as true, with correct metadata", async function () {
    const hash = hashOf("original content");
    await registry.registerContent(hash, "photo.jpg", "https://example.com/photo");

    const [isVerified, , , label, sourceUrl] = await registry.verifyContent(hash);
    expect(isVerified).to.equal(true);
    expect(label).to.equal("photo.jpg");
    expect(sourceUrl).to.equal("https://example.com/photo");
  });

  it("reports unverified for a hash that was never registered", async function () {
    const hash = hashOf("never registered");
    const [isVerified] = await registry.verifyContent(hash);
    expect(isVerified).to.equal(false);
  });

  it("detects tampering: a modified file's hash no longer verifies", async function () {
    const originalHash = hashOf("the real file content");
    await registry.registerContent(originalHash, "doc.txt", "");

    const tamperedHash = hashOf("the real file content, but edited");
    const [isVerified] = await registry.verifyContent(tamperedHash);
    expect(isVerified).to.equal(false);
  });

  it("rejects double-registration of the same hash", async function () {
    const hash = hashOf("duplicate");
    await registry.registerContent(hash, "a", "");
    await expect(registry.registerContent(hash, "b", "")).to.be.revertedWith(
      "Content already registered"
    );
  });
});
