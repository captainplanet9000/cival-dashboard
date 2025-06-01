import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { Farm } from '@/types/farm';
import { FarmDetailsView } from '@/components/farm/FarmDetailsView';
import { farmService } from '@/services/farm/farm-service';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface FarmDetailPageProps {
  initialFarmData?: Farm;
  error?: string;
}

export default function FarmDetailPage({ initialFarmData, error: initialError }: FarmDetailPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const [farm, setFarm] = useState<Farm | null>(initialFarmData || null);
  const [loading, setLoading] = useState(!initialFarmData);
  const [error, setError] = useState<string | null>(initialError || null);

  useEffect(() => {
    // If we already have initialFarmData, no need to fetch again
    if (initialFarmData || !id) return;

    const fetchFarm = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await farmService.getFarmById(id as string);
        if (result.success && result.data) {
          setFarm(result.data);
        } else {
          setError(result.error || 'Failed to fetch farm details');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFarm();
  }, [id, initialFarmData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="my-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'Farm not found'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/farms" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            ← Back to Farms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/farms" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4">
          ← Back to Farms
        </Link>
      </div>
      
      <FarmDetailsView farm={farm} />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params || {};

  if (!id) {
    return {
      props: {
        error: 'Invalid farm ID',
      },
    };
  }

  try {
    // Try to pre-fetch farm data server-side
    const result = await farmService.getFarmById(id as string);
    
    if (result.success && result.data) {
      return {
        props: {
          initialFarmData: result.data,
        },
      };
    } else {
      return {
        props: {
          error: result.error || 'Failed to fetch farm details',
        },
      };
    }
  } catch (error: any) {
    return {
      props: {
        error: error.message || 'An unexpected error occurred',
      },
    };
  }
}; 