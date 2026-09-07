# Provenance Verifier

A pipeline that finds where a piece of content appears on the web and
records a tamper-evident fingerprint of it on a blockchain, so it can be
re-verified later.

**Pipeline shape:** Content you own → reverse-image / web search (find
matching post) → hash the discovered content → register hash on-chain →
re-verify hash against the on-chain record at any later point.

## What this does *not* do

This project deliberately does not perform face detection, face
recognition, or any lookup that identifies a *person* from their photo.
It matches exact/near-duplicate **images or files**, the same category of
tool used for reverse-image search, copyright monitoring, and
brand-impersonation detection. You provide the content; nothing here
infers or looks up anyone's identity.

## Architecture

```
contracts/
  ProvenanceRegistry.sol   Solidity contract: register + verify content hashes
scripts/
  deploy.js                Deploys the contract to a running chain
  register.js              Hashes a local file (sha256) and registers it on-chain
  verify.js                Re-hashes a local file and checks it against on-chain records
  reverse-search.js        Reverse image search (Google Vision Web Detection API)
  fetch-and-hash.js        Downloads a discovered URL's image and hashes it
test/
  ProvenanceRegistry.test.js   Unit tests for the contract
sample-data/
  sample-post.txt          A file you can use to try the pipeline immediately
```

## Blockchain used

**Local Hardhat network** (a simulated Ethereum chain that runs on your
machine). This was chosen because it needs no wallet, no API keys, and no
faucet/testnet ETH, making it fast to demo and reproducible for graders.
The contract is plain Solidity with no Hardhat-specific dependencies, so
it deploys unmodified to a public testnet — an optional Polygon Amoy
config is already wired up in `hardhat.config.js` if you want an
explorer-visible deployment (see "Deploying to a public testnet" below).

## How to run it

### 1. Install dependencies

```bash
npm install
```

### 2. Start a local blockchain

In one terminal, leave this running:

```bash
npx hardhat node
```

This starts a local Ethereum-compatible chain at `http://127.0.0.1:8545`
with 20 pre-funded test accounts.

### 3. Deploy the contract

In a second terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This deploys `ProvenanceRegistry` and writes its address to
`deployment.json`, which the other scripts read automatically.

### 4. Register content on-chain

Using the included sample file:

```bash
npx hardhat run scripts/register.js --network localhost -- sample-data/sample-post.txt "sample post" ""
```

Or with your own file:

```bash
npx hardhat run scripts/register.js --network localhost -- /path/to/your-photo.jpg "my photo" "https://instagram.com/p/yourpost"
```

### 5. Verify it

```bash
npx hardhat run scripts/verify.js --network localhost -- sample-data/sample-post.txt
```

You should see `VERIFIED`, along with the submitter address, timestamp,
and label pulled from the on-chain record.

### 6. See tamper detection in action

Edit `sample-data/sample-post.txt` (add a character, save it), then
re-run step 5. It will now report `NOT VERIFIED`, because the file's hash
no longer matches what's on-chain — proving the record is tamper-evident.

### 7. (Optional) Full web-search → verify flow

If you want the search step live rather than using a file you already
have locally:

```bash
export GOOGLE_VISION_API_KEY=your_key_here
node scripts/reverse-search.js sample-data/your-image.jpg
# pick a matched URL from search-results.json, then:
node scripts/fetch-and-hash.js <matched-url>
npx hardhat run scripts/register.js --network localhost -- downloaded/<file> "found post" "<matched-url>"
npx hardhat run scripts/verify.js --network localhost -- downloaded/<file>
```

`reverse-search.js` uses the Google Cloud Vision Web Detection API (free
tier available). Swap in TinEye or Bing Visual Search if you prefer —
the function to change is `callVisionApi` in that file.

### Run the tests

```bash
npx hardhat test
```

## Deploying to a public testnet (optional)

1. Copy `.env.example` to `.env` and fill in `AMOY_RPC_URL` (e.g. from
   Alchemy or Infura) and `PRIVATE_KEY` (a testnet-only wallet key funded
   with Amoy faucet MATIC).
2. Run:
   ```bash
   npx hardhat run scripts/deploy.js --network amoy
   npx hardhat run scripts/register.js --network amoy -- sample-data/sample-post.txt "demo" ""
   npx hardhat run scripts/verify.js --network amoy -- sample-data/sample-post.txt
   ```
3. Look up the deployed contract address (printed to console, also saved
   in `deployment.json`) on [amoy.polygonscan.com](https://amoy.polygonscan.com)
   to see the on-chain transaction.

## Known limitations

- `reverse-search.js` requires a paid or free-tier API key from a
  reverse-image-search provider (Google Vision, TinEye, or Bing); none is
  bundled, since these require account signup.
- The registry hashes exact file bytes (sha256). It does not do
  perceptual/near-duplicate hashing, so a re-compressed or resized copy
  of an image will *not* match — this is intentional for this demo but
  could be extended with a perceptual hash library (e.g. `pHash`) if
  near-duplicate detection is desired.
- Local Hardhat state resets every time you stop `npx hardhat node` —
  redeploy and re-register after restarting it. Use the Amoy testnet
  config above for a persistent, explorer-visible deployment.
- No web UI is included, per the task's "no website required" note —
  interaction is via CLI scripts, demoed in the screen recording.
