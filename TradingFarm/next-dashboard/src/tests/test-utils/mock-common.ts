// Common mock utilities for all exchange adapter tests

/**
 * Creates a delay for async functions
 * @param ms milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mocks the crypto module for testing
 */
export function mockCrypto() {
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        digest: jest.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(32))),
      },
    },
  });
}

/**
 * Mocks fetch response for success cases
 * @param data Data to return in the response
 */
export function mockSuccessResponse(data: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data)
  });
}

/**
 * Mocks fetch response for error cases
 * @param status HTTP status code
 * @param message Error message
 */
export function mockErrorResponse(status = 400, message = 'Bad request') {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ code: status, message })
  });
}
