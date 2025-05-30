import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useContractState } from '@/lib/hooks';
import { useNFTMetadata } from '@/lib/hooks';
import { getIpfsImageSources } from '@/lib/ipfs';

// Define the prop types
interface NFTPageProps {
  tokenId: number;
}

export default function NFTPage({ tokenId }: NFTPageProps) {
  const router = useRouter();
  const { isRevealed } = useContractState();
  
  // Fetch metadata for this specific token
  const { metadata, isLoading, error } = useNFTMetadata(tokenId, isRevealed);
  
  // Get image sources with IPFS gateway fallbacks
  const imageSources = metadata?.image 
    ? getIpfsImageSources(metadata.image)
    : { src: '', srcSet: '' };
  
  return (
    <Layout
      title={metadata?.name || `Sonic NFT #${tokenId}`}
      description={metadata?.description || 'View details of this Sonic NFT'}
    >
      <div className="py-12 md:py-16">
        <Link href="/gallery" className="inline-flex items-center text-sonic-muted hover:text-sonic-text mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Back to Gallery
        </Link>
        
        {isLoading ? (
          <div className="sonic-card p-8 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 size={40} className="text-sonic-primary animate-spin mb-4" />
            <p className="text-sonic-muted">Loading NFT data...</p>
          </div>
        ) : error ? (
          <div className="sonic-card p-8 text-center">
            <p className="text-red-400">Failed to load NFT data. The token ID may not exist.</p>
            <Link href="/mint" className="sonic-button mt-4 inline-block">
              Mint a New NFT
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* NFT Image */}
            <div className="sonic-card p-6">
              <div className="relative aspect-square rounded-lg overflow-hidden">
                {imageSources.src ? (
                  <Image
                    src={imageSources.src}
                    alt={metadata?.name || `Sonic NFT #${tokenId}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    srcSet={imageSources.srcSet || undefined}
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-sonic-card">
                    <p className="text-sonic-muted">No image available</p>
                  </div>
                )}
                
                {/* Token ID badge */}
                <div className="absolute top-2 left-2 bg-sonic-primary/90 text-white px-2 py-0.5 rounded text-xs font-medium">
                  #{tokenId}
                </div>
                
                {/* Revealed badge */}
                <div className={`absolute top-2 right-2 ${isRevealed ? 'bg-green-500/80' : 'bg-amber-500/80'} text-white px-2 py-0.5 rounded text-xs font-medium`}>
                  {isRevealed ? 'Revealed' : 'Unrevealed'}
                </div>
              </div>
              
              {/* Image download & view on IPFS */}
              {metadata?.image && (
                <div className="mt-4 flex space-x-2">
                  <a 
                    href={imageSources.src} 
                    download={`sonic-nft-${tokenId}.png`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="sonic-button-secondary flex-1 flex items-center justify-center text-sm"
                  >
                    <Download size={14} className="mr-1" />
                    Download
                  </a>
                  <a 
                    href={metadata.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${metadata.image.replace('ipfs://', '')}` : metadata.image}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="sonic-button-secondary flex-1 flex items-center justify-center text-sm"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    View on IPFS
                  </a>
                </div>
              )}
            </div>
            
            {/* NFT Details */}
            <div className="space-y-6">
              <div className="sonic-card p-6">
                <h1 className="text-2xl font-bold text-sonic-text mb-2">
                  {metadata?.name || `Sonic NFT #${tokenId}`}
                </h1>
                <p className="text-sonic-muted mb-6">
                  {metadata?.description || 'This Sonic NFT is part of the collection on Sonic Network.'}
                </p>
                
                {metadata?.external_url && (
                  <a 
                    href={metadata.external_url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-sonic-primary flex items-center text-sm mb-6 hover:underline"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    View on Sonic NFT Website
                  </a>
                )}
                
                {/* Metadata raw JSON */}
                <div className="border-t border-sonic-secondary/10 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-sonic-text">Metadata</h3>
                    <a 
                      href={`/api/metadata/${tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="text-sonic-primary text-xs hover:underline"
                    >
                      View Raw JSON
                    </a>
                  </div>
                  <pre className="bg-sonic-card/50 p-3 rounded-lg text-xs overflow-auto max-h-[200px] text-sonic-muted">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              </div>
              
              {/* Attributes */}
              {metadata?.attributes && metadata.attributes.length > 0 && (
                <div className="sonic-card p-6">
                  <h3 className="text-lg font-medium text-sonic-text mb-4">Attributes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {metadata.attributes.map((attr, index) => (
                      <div key={index} className="bg-sonic-card/50 p-3 rounded-lg">
                        <p className="text-xs text-sonic-muted mb-1">{attr.trait_type}</p>
                        <p className="text-sm font-medium text-sonic-text">{attr.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Get the token ID from the URL parameters
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { tokenId } = context.params || {};
  
  // Validate token ID
  const parsedTokenId = parseInt(tokenId as string);
  
  if (isNaN(parsedTokenId)) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      tokenId: parsedTokenId,
    },
  };
}; 