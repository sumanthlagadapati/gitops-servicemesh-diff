/**
 * Basic usage examples for GitopsServicemeshDiff
 * Demonstrates default and verbose logging configurations
 */
import { GitopsServicemeshDiff } from "../src";

async function main(): Promise<void> {
  try {
    // Example 1: Create with default options
    console.log("Running with default options...\n");
    const instance = new GitopsServicemeshDiff();
    const result = await instance.run();
    console.log("Default run result:", result);

    // Example 2: Create with verbose logging
    console.log("\nRunning with verbose logging...\n");
    const verbose = new GitopsServicemeshDiff({ verbose: true });
    const verboseResult = await verbose.run();
    console.log("Verbose run result:", verboseResult);
  } catch (error) {
    console.error("Error during execution:", error);
    process.exit(1);
  }
}

main();