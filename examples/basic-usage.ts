import { GitopsServicemeshDiff } from "../src";

async function main() {
  // Create with default options
  const instance = new GitopsServicemeshDiff();
  const result = await instance.run();
  console.log("Default run:", result);

  // Create with custom options
  const verbose = new GitopsServicemeshDiff({ verbose: true });
  const verboseResult = await verbose.run();
  console.log("Verbose run:", verboseResult);
}

main().catch(console.error);
