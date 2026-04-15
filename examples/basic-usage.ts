/**
 * Example of improved TypeScript code with type annotations,
 * error handling, and descriptive comments.
 *
 * @module examples/basic-usage
 */

// Import necessary modules
import { SomeModule } from 'some-package';

/**
 * Function to demonstrate basic usage with improved TypeScript typings.
 *
 * @param input - The input parameter of type string.
 * @returns A greeting message or an error message.
 */
function greet(input: string): string {
    try {
        if (!input) {  // Check for empty input
            throw new Error('Input cannot be empty');
        }
        return `Hello, ${input}!`;
    } catch (error) {
        // Handle errors gracefully
        return `Error: ${error.message}`;
    }
}

// Example usage
const message = greet('World');
console.log(message); // Outputs: Hello, World!