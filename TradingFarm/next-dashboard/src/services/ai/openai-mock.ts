// Mock implementation of OpenAI for build purposes
export class MockOpenAI {
  embeddings = {
    create: async () => ({
      data: [{ embedding: new Array(1536).fill(0) }],
      usage: { prompt_tokens: 0, total_tokens: 0 }
    })
  };

  chat = {
    completions: {
      create: async () => ({
        choices: [
          {
            message: {
              content: "This is a mock response from OpenAI",
              role: "assistant"
            },
            finish_reason: "stop",
            index: 0
          }
        ],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      })
    }
  };

  // Add other methods as needed
}

// Export a mock instance
const mockOpenAI = new MockOpenAI();
export default mockOpenAI;
