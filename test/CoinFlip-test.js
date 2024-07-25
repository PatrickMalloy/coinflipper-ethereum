const { expect } = require("chai");
const { loadFixture } = require("")

describe("CoinFlip", function() {
  async function deploy() {
    const CoinFlip = await ethers.getContractFactory("CoinFlip");
    const coinFlip = await CoinFlip.deploy();
    await greeter.deployed();
  }

  it("Should start with Pool Balance = 0", async function() {

    expect(await greeter.greet()).to.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
    
    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
