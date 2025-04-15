// Jest setup file
import '@testing-library/jest-dom';

// Mock the window.crypto for testing
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

// Setup global fetch mocks
global.fetch = jest.fn();

// Setup global WebSocket mock
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
}));

// Suppress console errors during tests
jest.spyOn(console, 'error').mockImplementation(() => {});
