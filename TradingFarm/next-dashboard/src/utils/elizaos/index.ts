import { elizaOSPluginManager } from './plugin-manager';

export * from './plugin-manager';

// Initialize plugins when this module is imported
const initializePlugins = async () => {
  try {
    await elizaOSPluginManager.initialize();
  } catch (error) {
    console.error('Failed to initialize ElizaOS plugins:', error);
  }
};

// Run initialization in development and production
if (typeof window !== 'undefined') {
  // Client-side initialization
  initializePlugins();
} else {
  // Server-side initialization
  initializePlugins();
}
