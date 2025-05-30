import { v4 as uuidv4 } from 'uuid';
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { 
  VaultAccount, 
  LegacyWalletMigration,
  createUnifiedBankingService 
} from '@/services/unified-banking-service';

export interface LegacyWallet {
  id: string;
  name: string;
  description?: string;
  balance: number;
  wallet_type: string;
  farm_id?: string;
  agent_id?: string;
  user_id: string;
  status?: string;
  metadata?: any;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  vaultAccountId?: string;
  migrationId?: string;
  errors?: string[];
}

export interface MigrationReport {
  totalWallets: number;
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  details: {
    migrated: MigrationResult[];
    failed: MigrationResult[];
    skipped: MigrationResult[];
  };
}

export class WalletMigrationService {
  private isMock: boolean = false;
  private bankingService;
  private mockWallets: LegacyWallet[] = [];
  private mockMigrations: LegacyWalletMigration[] = [];
  
  constructor(isMockMode: boolean = false) {
    this.isMock = isMockMode;
    this.bankingService = createUnifiedBankingService();
    
    // Initialize sample legacy wallets for mock mode
    if (this.isMock) {
      this.initializeMockData();
    }
  }
  
  private initializeMockData() {
    // Sample legacy wallets for testing
    this.mockWallets = [
      {
        id: uuidv4(),
        name: 'Legacy Main Wallet',
        description: 'Primary trading wallet',
        balance: 5000,
        wallet_type: 'main',
        user_id: 'user-1',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Legacy Farm Wallet',
        description: 'Trading farm wallet',
        balance: 2500,
        wallet_type: 'farm',
        farm_id: 'farm-1',
        user_id: 'user-1',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Legacy Agent Wallet',
        description: 'Trading agent wallet',
        balance: 1000,
        wallet_type: 'agent',
        agent_id: 'agent-1',
        user_id: 'user-1',
        status: 'active'
      },
      {
        id: uuidv4(),
        name: 'Inactive Wallet',
        balance: 0,
        wallet_type: 'main',
        user_id: 'user-1',
        status: 'inactive'
      },
    ];
  }
  
  /**
   * Get all legacy wallets for the current user
   */
  async getLegacyWallets(): Promise<LegacyWallet[]> {
    if (this.isMock) {
      return this.mockWallets;
    } else {
      const supabase = createBrowserClient();
      
      // Query legacy wallets table (assuming it exists)
      const { data, error } = await supabase
        .from('legacy_wallets')
        .select('*');
      
      if (error) {
        throw new Error(`Failed to fetch legacy wallets: ${error.message}`);
      }
      
      return data || [];
    }
  }
  
  /**
   * Get migration status for a specific wallet
   */
  async getWalletMigrationStatus(walletId: string): Promise<LegacyWalletMigration | null> {
    if (this.isMock) {
      return this.mockMigrations.find(m => m.wallet_id === walletId) || null;
    } else {
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('legacy_wallet_migrations')
        .select('*')
        .eq('wallet_id', walletId)
        .maybeSingle();
      
      if (error) {
        throw new Error(`Failed to fetch migration status: ${error.message}`);
      }
      
      return data;
    }
  }
  
  /**
   * Migrate a single wallet to the vault system
   */
  async migrateWallet(wallet: LegacyWallet): Promise<MigrationResult> {
    try {
      // Check if wallet has already been migrated
      const existingMigration = await this.getWalletMigrationStatus(wallet.id);
      
      if (existingMigration && existingMigration.migration_status === 'completed') {
        return {
          success: false,
          message: 'Wallet has already been migrated',
          vaultAccountId: existingMigration.vault_account_id,
          migrationId: existingMigration.id
        };
      }
      
      // Map legacy wallet type to new account type
      let accountType: 'master' | 'farm' | 'agent';
      switch (wallet.wallet_type) {
        case 'main':
          accountType = 'master';
          break;
        case 'farm':
          accountType = 'farm';
          break;
        case 'agent':
        case 'bot':
          accountType = 'agent';
          break;
        default:
          accountType = 'master';
      }
      
      // Create a new vault account
      const vaultAccount: VaultAccount = {
        name: `${wallet.name} (Migrated)`,
        description: wallet.description || 'Migrated from legacy wallet',
        balance: wallet.balance,
        account_type: accountType,
        farm_id: wallet.farm_id,
        agent_id: wallet.agent_id,
        security_level: 'standard', // Default to standard security
        status: wallet.status === 'inactive' ? 'inactive' : 'active',
        metadata: {
          ...wallet.metadata,
          migrated_from: wallet.id,
          migration_date: new Date().toISOString()
        }
      };
      
      // Create the vault account
      const newVaultAccount = await this.bankingService.createAccount(vaultAccount);
      
      // Record the migration
      const migration = await this.bankingService.migrateLegacyWallet(
        wallet.id,
        newVaultAccount.id!
      );
      
      if (this.isMock) {
        this.mockMigrations.push(migration);
      }
      
      return {
        success: true,
        message: 'Wallet successfully migrated',
        vaultAccountId: newVaultAccount.id,
        migrationId: migration.id
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to migrate wallet',
        errors: [error.message]
      };
    }
  }
  
  /**
   * Migrate multiple wallets in batch
   */
  async migrateWallets(wallets: LegacyWallet[]): Promise<MigrationReport> {
    const report: MigrationReport = {
      totalWallets: wallets.length,
      migratedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      details: {
        migrated: [],
        failed: [],
        skipped: []
      }
    };
    
    for (const wallet of wallets) {
      // Check if wallet has already been migrated
      const existingMigration = await this.getWalletMigrationStatus(wallet.id);
      
      if (existingMigration && existingMigration.migration_status === 'completed') {
        report.skippedCount++;
        report.details.skipped.push({
          success: false,
          message: 'Wallet has already been migrated',
          vaultAccountId: existingMigration.vault_account_id,
          migrationId: existingMigration.id
        });
        continue;
      }
      
      // Migrate the wallet
      const result = await this.migrateWallet(wallet);
      
      if (result.success) {
        report.migratedCount++;
        report.details.migrated.push(result);
      } else if (result.vaultAccountId) {
        report.skippedCount++;
        report.details.skipped.push(result);
      } else {
        report.failedCount++;
        report.details.failed.push(result);
      }
    }
    
    return report;
  }
  
  /**
   * Generate a preview of what will be migrated
   */
  async generateMigrationPreview(wallets: LegacyWallet[]): Promise<{
    toMigrate: LegacyWallet[];
    alreadyMigrated: LegacyWallet[];
  }> {
    const toMigrate: LegacyWallet[] = [];
    const alreadyMigrated: LegacyWallet[] = [];
    
    for (const wallet of wallets) {
      const migration = await this.getWalletMigrationStatus(wallet.id);
      
      if (migration && migration.migration_status === 'completed') {
        alreadyMigrated.push(wallet);
      } else {
        toMigrate.push(wallet);
      }
    }
    
    return {
      toMigrate,
      alreadyMigrated
    };
  }
  
  /**
   * Server-side migration helper for bulk operations
   */
  static async processBulkMigration(userID: string): Promise<MigrationReport> {
    try {
      const supabase = await createServerClient();
      
      // Fetch all legacy wallets for the user
      const { data: wallets, error } = await supabase
        .from('legacy_wallets')
        .select('*')
        .eq('user_id', userID);
      
      if (error) {
        throw new Error(`Failed to fetch legacy wallets: ${error.message}`);
      }
      
      // Create an instance of the migration service
      const migrationService = new WalletMigrationService(false);
      
      // Migrate all wallets
      const report = await migrationService.migrateWallets(wallets || []);
      
      return report;
    } catch (error: any) {
      return {
        totalWallets: 0,
        migratedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        details: {
          migrated: [],
          failed: [{
            success: false,
            message: `Server error: ${error.message}`,
            errors: [error.message]
          }],
          skipped: []
        }
      };
    }
  }
}

// Helper function to create an instance of the migration service
export function createWalletMigrationService(): WalletMigrationService {
  const forceMockMode = process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true';
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  
  return new WalletMigrationService(forceMockMode || isDemoMode);
}
