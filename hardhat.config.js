require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Default local network used by `npx hardhat node`.
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Optional: public testnet deployment. Only used if you fill in .env.
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
