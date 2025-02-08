// scripts/deploy.js
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
  
    const RecoveryWallet = await ethers.getContractFactory("RecoveryWallet");
  
    // Define initial parameters.
    // For example, use the deployer's address as the owner.
    // Replace the guardian addresses with valid Ethereum addresses.
    const owner = deployer.address;
    const guardians = [
      "0x1234567890123456789012345678901234567890",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "0x9876543210987654321098765432109876543210"
    ];
    const recoveryThreshold = 2; // e.g., at least 2 guardian votes required
  
    const wallet = await RecoveryWallet.deploy(owner, guardians, recoveryThreshold);
    await wallet.deployed();
  
    console.log("RecoveryWallet deployed to:", wallet.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  