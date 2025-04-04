'use server'

import { createServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Database schema diagnostic API
 * This is a temporary endpoint for debugging database schema issues
 * You should remove this once the issues are resolved
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Check id column types
    const { data: idColumns, error: idError } = await supabase.rpc('check_id_columns')
    
    if (idError) {
      return NextResponse.json(
        { error: 'Failed to query ID columns', details: idError.message },
        { status: 500 }
      )
    }
    
    // Check farms table structure
    const { data: farmsSchema, error: farmsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, udt_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'farms')
    
    if (farmsError) {
      return NextResponse.json(
        { error: 'Failed to query farms table schema', details: farmsError.message },
        { status: 500 }
      )
    }
    
    // Check for existing wallet tables
    const { data: walletTables, error: walletTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'wallet%')
    
    if (walletTablesError) {
      return NextResponse.json(
        { error: 'Failed to query wallet tables', details: walletTablesError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      idColumns,
      farmsSchema,
      walletTables
    })
    
  } catch (error) {
    console.error('Error querying schema:', error)
    return NextResponse.json(
      { error: 'Failed to query database schema' },
      { status: 500 }
    )
  }
}
