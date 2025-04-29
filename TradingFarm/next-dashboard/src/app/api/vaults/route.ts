import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

// GET /api/vaults - List vaults
export async function GET(req: Request) {
  try {
    // During development, we'll mock the data without requiring authentication
    // In a real implementation, this would check auth and query the vaults table
    
    // Mock user ID for development
    const mockUserId = "dev-user-123";
    
    // We're providing mock data for now
    const mockVaults = [
      {
        id: "v1",
        name: "Main Trading Vault",
        description: "Primary vault for trading operations",
        created_at: new Date().toISOString(),
        owner_id: mockUserId,
        balance: 25000,
        members: 3
      },
      {
        id: "v2",
        name: "DeFi Investments",
        description: "Vault for DeFi positions and yield farming",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        owner_id: mockUserId,
        balance: 10000,
        members: 1
      },
      {
        id: "v3",
        name: "Reserve Fund",
        description: "Emergency reserves and stability fund",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        owner_id: mockUserId,
        balance: 5000,
        members: 2
      }
    ];
    
    return NextResponse.json({ vaults: mockVaults });
  } catch (error: any) {
    console.error("Error fetching vaults:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/vaults - Create vault
export async function POST(req: Request) {
  try {
    // During development, we'll mock without requiring authentication
    // Mock user ID for development
    const mockUserId = "dev-user-123";
    
    const body = await req.json();
    const { name, description, metadata } = body;
    
    // In a production environment, this would use a database call
    // For now, simulate a successful creation
    const mockVault = {
      id: `v${Date.now()}`,
      name,
      description,
      created_at: new Date().toISOString(),
      owner_id: mockUserId,
      metadata: metadata || {}
    };
    
    return NextResponse.json({ vault: mockVault }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating vault:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
