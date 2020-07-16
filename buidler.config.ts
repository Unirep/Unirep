import { BuidlerConfig, usePlugin, task } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-waffle");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, bre) => {
  const accounts = await bre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

const config: BuidlerConfig = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: "0.5.16",
    optimizer: { enabled: true, runs: 200 }
  },
};

export default config;