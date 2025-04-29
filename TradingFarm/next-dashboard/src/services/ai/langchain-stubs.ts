/**
 * Stub implementations for langchain packages to allow building without the actual dependencies
 * These can be replaced with real implementations once the packages are installed
 */

// @langchain/anthropic stub
export const AnthropicStub = {
  ChatAnthropic: class ChatAnthropic {
    constructor(options: any) {
    }
    stream(messages: any[]) {
      return {
        [Symbol.asyncIterator]: async function* () {
          yield { content: "This is a mock stream response from Anthropic" };
        }
      };
    }
  }
};

// Google GenerativeAI model stub
export const GoogleGenAIStub = {
  ChatGoogleGenerativeAI: class ChatGoogleGenerativeAI {
    constructor(config: any) {}
    invoke(messages: any[]) {
      return Promise.resolve({
        content: "This is a mock response from Google GenerativeAI"
      });
    }
    stream(messages: any[]) {
      return {
        [Symbol.asyncIterator]: async function* () {
          yield { content: "This is a mock stream response from Google GenerativeAI" };
        }
      };
    }
  }
};

// HNSWLib mock to avoid node:fs/promises dependency
export class MockHNSWLib {
  private documents: any[] = [];
  
  constructor() {}
  
  static fromDocuments(documents: any[], embeddings: any) {
    const instance = new MockHNSWLib();
    instance.documents = documents;
    return Promise.resolve(instance);
  }

  similaritySearch(query: string, k: number = 4) {
    // Return at most k documents (or fewer if we don't have enough)
    return Promise.resolve(this.documents.slice(0, k));
  }

  save() {
    return Promise.resolve();
  }

  load() {
    return Promise.resolve(this);
  }
}
