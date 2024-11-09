const axios = require("axios");
const stringSimilarity = require("string-similarity");
const testCases = require("./test_data/test_cases.json"); // Load test cases

// Evaluation function
async function evaluateModel() {
  let totalCases = 0;
  let passedCases = 0;

  for (const testCase of testCases) {
    totalCases++;
    const { task, input, expected_output } = testCase;

    try {
      // Sending request to each task endpoint
      const response = await axios.post(
        `http://localhost:5000/api/watson/${task}`,
        input
      );
      const modelOutput = response.data.generated_text.trim();
      const expectedOutput = expected_output.trim();

      // Define matching criteria (exact match or similarity-based)
      const similarity = stringSimilarity.compareTwoStrings(
        modelOutput,
        expectedOutput
      );
      const isMatch = similarity >= 0.8; // 80% threshold for non-exact tasks

      if (isMatch) {
        passedCases++;
      } else {
        console.log(`--- Task Failed ---`);
        console.log(`Task: ${task}`);
        console.log(`Input: ${JSON.stringify(input)}`);
        console.log(`Expected Output: ${expectedOutput}`);
        console.log(`Model Output: ${modelOutput}`);
        console.log(`Similarity Score: ${similarity}\n`);
      }
    } catch (error) {
      console.error(`Error with task ${task}: ${error.message}`);
    }
  }

  const accuracy = (passedCases / totalCases) * 100;
  console.log(`\nEvaluation Complete.`);
  console.log(`Total Cases: ${totalCases}`);
  console.log(`Passed Cases: ${passedCases}`);
  console.log(`Model Accuracy: ${accuracy.toFixed(2)}%`);
}

evaluateModel();
