import { useState } from 'react';
import { 
  useAccount, 
  useContractWrite, 
  usePrepareContractWrite,
  useNetwork,
  useWaitForTransaction
} from 'wagmi';
import { getContractConfig } from '@/lib/web3Config';

/**
 * Custom hook for minting NFTs
 * Records ownership after successful minting
 */
export function useContractMint() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const [quantity, setQuantity] = useState(1);
  
  // Prepare the mint transaction
  const { 
    config, 
    error: prepareError,
    isError: isPrepareError
  } = usePrepareContractWrite({
    ...getContractConfig(chain?.id),
    functionName: 'mint',
    args: [quantity],
    enabled: !!address && quantity > 0,
  });
  
  // Set up the actual contract write function
  const { 
    write: mint, 
    data: mintData,
    error: mintError,
    isLoading: isMintLoading,
    isSuccess: isMintStarted,
    isError: isMintError,
    reset: resetMint
  } = useContractWrite(config);
  
  // Set up transaction monitoring
  const { 
    data: txData,
    isLoading: isTxLoading,
    isSuccess: isTxSuccess,
    isError: isTxError,
    error: txError
  } = useWaitForTransaction({
    hash: mintData?.hash,
    enabled: !!mintData?.hash,
    onSuccess: handleMintSuccess,
  });

  // Error handling
  const error = prepareError || mintError || txError;
  const isError = isPrepareError || isMintError || isTxError;
  
  // Helper state
  const isLoading = isMintLoading || isTxLoading;
  const isSuccess = isTxSuccess;
  
  // Function to handle successful mint and record to database
  async function handleMintSuccess(data: any) {
    try {
      // Check if we have any events in the receipt
      const receipt = data;
      
      if (receipt && receipt.logs) {
        // Loop through logs to find Minted event(s)
        receipt.logs.forEach(async (log: any, index: number) => {
          // Basic check for event (in a real app, decode logs properly)
          // We assume token IDs are sequential and start from the last minted + 1
          const tokenId = index; // Placeholder, replace with actual token ID from event
          
          // Record this mint in the database (only if we have the token ID)
          if (address && receipt.transactionHash) {
            try {
              // Use the API to record ownership
              const response = await fetch('/api/ownership/update', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '', // Frontend-safe API key
                },
                body: JSON.stringify({
                  tokenId: tokenId,
                  ownerAddress: address,
                  transactionHash: receipt.transactionHash,
                }),
              });
              
              if (!response.ok) {
                console.error('Failed to record NFT ownership:', await response.text());
              }
            } catch (err) {
              console.error('Error recording NFT ownership:', err);
              // Non-blocking error, we don't need to show this to the user
            }
          }
        });
      }
    } catch (err) {
      console.error('Error processing mint success:', err);
    }
  }
  
  return {
    mint,
    quantity,
    setQuantity,
    mintData,
    txData,
    isLoading,
    isSuccess,
    isError,
    error,
    reset: resetMint,
  };
}

export default useContractMint; 