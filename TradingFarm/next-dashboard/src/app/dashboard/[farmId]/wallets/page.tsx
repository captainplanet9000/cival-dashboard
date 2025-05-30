import React from 'react';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import WalletDashboard from '@/components/wallet/wallet-dashboard';

interface WalletsPageProps {
  params: {
    farmId: string;
  };
}

export default async function WalletsPage({ params }: WalletsPageProps) {
  const { farmId } = params;
  const farmIdNumber = parseInt(farmId, 10);
  
  try {
    const supabase = await createServerClient();
    
    // Get the user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return notFound();
    }
    
    // Fetch farm details to verify access
    const { data: farm, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmIdNumber)
      .single();
    
    if (error || !farm) {
      console.error('Error fetching farm:', error);
      return notFound();
    }
    
    // Check if user has access to this farm
    if (farm.owner_id !== user.id) {
      console.log('User does not own this farm, access denied');
      return notFound();
    }
    
    return (
      <div className="container mx-auto">
        <WalletDashboard farmId={farmId} userId={user.id} />
      </div>
    );
  } catch (error) {
    console.error('Wallets page error:', error);
    return notFound();
  }
}
