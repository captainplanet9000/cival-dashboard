// This edge function reconciles vault account balances with their transaction history
// It helps maintain data integrity by identifying and correcting discrepancies

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

interface VaultAccount {
  id: number;
  vault_master_id: number;
  name: string;
  currency_code: string;
  balance: number;
  user_id: string;
}

interface ReconciliationResult {
  account_id: number;
  calculated_balance: number;
  current_balance: number;
  discrepancy: number;
  transaction_count: number;
  was_corrected: boolean;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      // Supabase API URL - env var injected by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var injected by default when deployed
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      // Create client with Auth header from the middleware
      { global: { headers: { Authorization: authHeader } } }
    )

    console.log('Starting vault account reconciliation')

    // Get parameters from request
    const { accountId, autoCorrect = false } = await req.json().catch(() => ({ 
      accountId: null, 
      autoCorrect: false 
    }))
    
    // Query for accounts to reconcile
    let accountsQuery = supabaseClient
      .from('vault_accounts')
      .select('id, vault_master_id, name, currency_code, balance, user_id')
      .eq('is_active', true)
    
    if (accountId) {
      accountsQuery = accountsQuery.eq('id', accountId)
    }
    
    const { data: accounts, error: accountsError } = await accountsQuery
    
    if (accountsError) {
      throw accountsError
    }
    
    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active accounts to reconcile'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Reconciling ${accounts.length} vault accounts`)
    
    // Array to collect reconciliation results
    const results: ReconciliationResult[] = []
    
    // Process each account
    for (const account of accounts as VaultAccount[]) {
      // Get all transactions for this account
      const { data: transactions, error: txError } = await supabaseClient
        .from('vault_transactions')
        .select('amount, transaction_type')
        .eq('vault_account_id', account.id)
      
      if (txError) {
        console.error(`Error fetching transactions for account ${account.id}:`, txError)
        continue
      }
      
      // Calculate the balance based on transactions
      let calculatedBalance = 0
      for (const tx of transactions || []) {
        calculatedBalance += tx.amount
      }
      
      // Calculate discrepancy
      const discrepancy = account.balance - calculatedBalance
      const hasDiscrepancy = Math.abs(discrepancy) > 0.001 // Use a small epsilon for floating point comparisons
      
      // Record the reconciliation result
      const result: ReconciliationResult = {
        account_id: account.id,
        calculated_balance: calculatedBalance,
        current_balance: account.balance,
        discrepancy,
        transaction_count: (transactions || []).length,
        was_corrected: false
      }
      
      // Auto-correct the balance if specified and there's a discrepancy
      if (autoCorrect && hasDiscrepancy) {
        console.log(`Correcting balance for account ${account.id}: ${account.balance} → ${calculatedBalance}`)
        
        // Create a correction transaction
        const { error: correctionError } = await supabaseClient
          .from('vault_transactions')
          .insert({
            vault_account_id: account.id,
            amount: discrepancy,
            transaction_type: 'adjustment',
            description: 'Automatic balance reconciliation',
            category: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (correctionError) {
          console.error(`Error creating correction transaction for account ${account.id}:`, correctionError)
        } else {
          // Update the account balance to match the calculated value
          const { error: updateError } = await supabaseClient
            .from('vault_accounts')
            .update({ balance: calculatedBalance })
            .eq('id', account.id)
          
          if (updateError) {
            console.error(`Error updating balance for account ${account.id}:`, updateError)
          } else {
            result.was_corrected = true
            
            // Create audit log entry for the correction
            await supabaseClient
              .from('audit_logs')
              .insert({
                user_id: 'system',
                action: 'balance_reconciliation',
                entity_type: 'vault_account',
                entity_id: account.id,
                before_state: { balance: account.balance },
                after_state: { balance: calculatedBalance },
                created_at: new Date().toISOString()
              })
              .then(({ error }) => {
                if (error) console.error('Error creating audit log:', error)
              })
            
            // Create a notification for the user
            if (hasDiscrepancy) {
              await supabaseClient
                .from('notifications')
                .insert({
                  user_id: account.user_id,
                  title: 'Account Balance Adjusted',
                  message: `Your account "${account.name}" balance has been adjusted by ${discrepancy.toFixed(2)} ${account.currency_code} during reconciliation.`,
                  type: 'account_adjustment',
                  metadata: {
                    account_id: account.id,
                    previous_balance: account.balance,
                    new_balance: calculatedBalance,
                    adjustment: discrepancy
                  },
                  is_read: false,
                  created_at: new Date().toISOString()
                })
                .then(({ error }) => {
                  if (error) console.error('Error creating notification:', error)
                })
            }
          }
        }
      }
      
      results.push(result)
    }
    
    // Summarize results
    const discrepancyCount = results.filter(r => Math.abs(r.discrepancy) > 0.001).length
    const correctedCount = results.filter(r => r.was_corrected).length
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reconciled ${accounts.length} accounts, found ${discrepancyCount} discrepancies, corrected ${correctedCount}`,
        data: {
          results,
          summary: {
            total: accounts.length,
            discrepancies: discrepancyCount,
            corrected: correctedCount
          }
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in vault-reconciliation function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
