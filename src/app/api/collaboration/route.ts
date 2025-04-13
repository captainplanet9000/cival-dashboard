import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { collaborativeIntelligenceService } from '@/services/collaborative-intelligence-service';

// GET handler to retrieve collaborative data
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'insights';
    const farmId = searchParams.get('farmId') || undefined;
    const teamId = searchParams.get('teamId') || undefined;
    
    let data;
    
    switch (type) {
      case 'insights':
        data = await collaborativeIntelligenceService.getInsightsForServer(farmId);
        break;
      case 'resources':
        data = await collaborativeIntelligenceService.getSharedResourcesForServer(farmId);
        break;
      case 'tasks':
        data = await collaborativeIntelligenceService.getCollaborationTasksForServer(farmId, teamId);
        break;
      case 'teams':
        data = await collaborativeIntelligenceService.getAgentTeamsForServer(farmId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error in collaboration API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST handler to create collaborative data
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { type, data } = body;
    
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    let result;
    
    switch (type) {
      case 'insight':
        result = await supabase
          .from('collaborative_insights')
          .insert({
            ...data,
            author_id: user.id
          })
          .select();
        break;
      case 'resource':
        result = await supabase
          .from('shared_resources')
          .insert({
            ...data,
            owner_id: user.id
          })
          .select();
        break;
      case 'task':
        result = await supabase
          .from('collaboration_tasks')
          .insert(data)
          .select();
        break;
      case 'team':
        // For teams, we need to create the team and then add members
        const teamResult = await supabase
          .from('collaborative_agent_teams')
          .insert({
            name: data.name,
            description: data.description,
            active_task: data.active_task,
            farm_id: data.farm_id
          })
          .select();
          
        if (teamResult.error) {
          throw teamResult.error;
        }
        
        const teamId = teamResult.data[0].id;
        
        // Add team members
        const memberPromises = data.members.map((member: any) => 
          supabase
            .from('collaborative_team_members')
            .insert({
              team_id: teamId,
              member_id: member.id,
              name: member.name,
              role: member.role,
              type: member.type,
              avatar: member.avatar
            })
        );
        
        await Promise.all(memberPromises);
        
        result = {
          data: [{
            ...teamResult.data[0],
            members: data.members
          }],
          error: null
        };
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({ data: result.data[0] });
  } catch (error: any) {
    console.error('Error in collaboration API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH handler to update collaborative data
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { type, id, data } = body;
    
    if (!type || !id || !data) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    let result;
    
    switch (type) {
      case 'insight':
        result = await supabase
          .from('collaborative_insights')
          .update(data)
          .eq('id', id)
          .select();
        break;
      case 'resource':
        result = await supabase
          .from('shared_resources')
          .update(data)
          .eq('id', id)
          .select();
        break;
      case 'task':
        result = await supabase
          .from('collaboration_tasks')
          .update(data)
          .eq('id', id)
          .select();
        break;
      case 'team':
        result = await supabase
          .from('collaborative_agent_teams')
          .update(data)
          .eq('id', id)
          .select();
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({ data: result.data[0] });
  } catch (error: any) {
    console.error('Error in collaboration API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE handler to delete collaborative data
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    let result;
    
    switch (type) {
      case 'insight':
        result = await supabase
          .from('collaborative_insights')
          .delete()
          .eq('id', id);
        break;
      case 'resource':
        result = await supabase
          .from('shared_resources')
          .delete()
          .eq('id', id);
        break;
      case 'task':
        result = await supabase
          .from('collaboration_tasks')
          .delete()
          .eq('id', id);
        break;
      case 'team':
        // Delete team members first
        await supabase
          .from('collaborative_team_members')
          .delete()
          .eq('team_id', id);
          
        // Then delete the team
        result = await supabase
          .from('collaborative_agent_teams')
          .delete()
          .eq('id', id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in collaboration API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 