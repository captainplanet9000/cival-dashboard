import React from 'react';
import Head from 'next/head';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  twitterCardType?: 'summary' | 'summary_large_image';
  isNftCollection?: boolean;
  collectionData?: {
    name: string;
    description: string;
    totalSupply: number;
    mintedCount: number;
    creator: string;
    priceRange: string;
  };
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Sonic NFT Collection',
  description = 'Unique generative art NFTs on the Sonic blockchain. Mint your own one-of-a-kind digital artwork for 500 SONIC tokens today.',
  image = 'https://your-domain.com/images/og-image.jpg',
  url = 'https://your-domain.com',
  twitterCardType = 'summary_large_image',
  isNftCollection = false,
  collectionData,
}) => {
  const fullTitle = title === 'Sonic NFT Collection' ? title : `${title} | Sonic NFT Collection`;
  
  // Generate structured data for NFT collection pages
  const generateNftCollectionSchema = () => {
    if (!isNftCollection || !collectionData) return null;
    
    const { name, description, totalSupply, mintedCount, creator, priceRange } = collectionData;
    
    const nftCollectionSchema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      description,
      about: {
        '@type': 'CreativeWork',
        name: 'NFT Collection',
        description,
        creator: {
          '@type': 'Person',
          name: creator,
        },
      },
      offers: {
        '@type': 'AggregateOffer',
        offerCount: totalSupply,
        availableItemCount: totalSupply - mintedCount,
        priceCurrency: 'SONIC',
        priceSpecification: {
          '@type': 'PriceSpecification',
          description: priceRange,
        },
      },
    };
    
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(nftCollectionSchema),
        }}
      />
    );
  };
  
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter */}
      <meta property="twitter:card" content={twitterCardType} />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      
      {/* Additional tags for NFT site */}
      <meta name="keywords" content="NFT, Sonic blockchain, SONIC tokens, generative art, digital collectibles, mint NFT, crypto art" />
      <meta name="robots" content="index, follow" />
      <meta name="theme-color" content="#6366f1" />
      
      {/* Structured data for NFT collection */}
      {isNftCollection && generateNftCollectionSchema()}
    </Head>
  );
};

export default SEO; 