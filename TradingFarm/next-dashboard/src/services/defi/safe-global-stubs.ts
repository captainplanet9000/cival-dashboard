/**
 * Stub implementations for @safe-global/protocol-kit to allow building without the actual dependencies
 * These can be replaced with real implementations once the packages are installed
 */

export const SafeFactory = {
  create: (config: any) => {
    console.log('SafeFactory.create called with config:', config);
    return {
      deploySafe: async (safeAccountConfig: any) => {
        console.log('SafeFactory.deploySafe called with config:', safeAccountConfig);
        return {
          getAddress: () => '0xStubSafeAddress',
          getSafeInfo: () => ({
            safeAddress: '0xStubSafeAddress',
            owners: ['0xStubOwner1', '0xStubOwner2'],
            threshold: 1,
            nonce: 0,
          }),
        };
      },
      predictSafeAddress: async (safeAccountConfig: any) => {
        console.log('SafeFactory.predictSafeAddress called with config:', safeAccountConfig);
        return '0xStubPredictedSafeAddress';
      }
    };
  }
};

export const Safe = {
  create: (config: any) => {
    console.log('Safe.create called with config:', config);
    return {
      getAddress: () => '0xStubSafeAddress',
      getOwners: async () => ['0xStubOwner1', '0xStubOwner2'],
      getThreshold: async () => 1,
      getNonce: async () => 0,
      createTransaction: async (tx: any) => {
        console.log('Safe.createTransaction called with tx:', tx);
        return {
          data: '0xStubTxData',
          signatures: {},
          addSignature: (signature: any) => {
            console.log('addSignature called with:', signature);
          },
        };
      },
      executeTransaction: async (tx: any) => {
        console.log('Safe.executeTransaction called with tx:', tx);
        return {
          hash: '0xStubTxHash',
        };
      },
    };
  }
};

export const EthersAdapter = {
  create: (ethersProvider: any) => {
    console.log('EthersAdapter.create called with provider:', ethersProvider);
    return {
      getProvider: () => ethersProvider,
    };
  }
};
