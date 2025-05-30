import { NextResponse } from 'next/server';
import { balancePollingService } from '@/utils/exchange/balance-polling-service';

/**
 * API route that can be called by a cron job to refresh all wallet balances.
 * This can be triggered by a scheduling service like Vercel Cron Jobs.
 * 
 * Example cron schedule: every 5 minutes
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    
    // Verify cron job secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== cronSecret)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // Start or get the balance polling service
    const status = balancePollingService.getStatus();
    
    if (!status.isPolling) {
      await balancePollingService.start();
      return NextResponse.json({ 
        success: true,
        message: 'Balance polling service started',
        status: balancePollingService.getStatus()
      });
    } else {
      // Trigger an immediate poll cycle if already running
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          await balancePollingService.pollBalances();
          resolve();
        }, 0);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Balance refresh triggered',
        status: balancePollingService.getStatus()
      });
    }
  } catch (error: any) {
    console.error('Error in balance refresh cron job:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500 }
    );
  }
}
