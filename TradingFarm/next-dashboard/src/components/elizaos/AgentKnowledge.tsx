import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { createBrowserClient } from '@/utils/supabase/client';

interface AgentKnowledgeProps {
  agentId: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  relevance: number;
}

export default function AgentKnowledge({ agentId }: AgentKnowledgeProps) {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    type: 'note'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    fetchKnowledge();
  }, [agentId]);

  const fetchKnowledge = async () => {
    const { data, error } = await supabase
      .from('elizaos_knowledge')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setKnowledgeItems(data);
    }
  };

  const addKnowledgeItem = async () => {
    if (!newItem.title || !newItem.content) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('elizaos_knowledge')
        .insert([{
          agent_id: agentId,
          title: newItem.title,
          content: newItem.content,
          type: newItem.type,
          relevance: 0
        }])
        .select();

      if (!error && data) {
        setKnowledgeItems(prev => [data[0], ...prev]);
        setNewItem({ title: '', content: '', type: 'note' });
      }
    } catch (error) {
      console.error('Error adding knowledge item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      note: 'bg-blue-500',
      strategy: 'bg-purple-500',
      market: 'bg-green-500',
      risk: 'bg-red-500',
      system: 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const filteredItems = knowledgeItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Knowledge Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Add Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={newItem.title}
              onChange={(e) => setNewItem({...newItem, title: e.target.value})}
              placeholder="Knowledge title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea
              value={newItem.content}
              onChange={(e) => setNewItem({...newItem, content: e.target.value})}
              placeholder="Knowledge content"
              rows={8}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({...newItem, type: e.target.value})}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="note">Note</option>
              <option value="strategy">Strategy</option>
              <option value="market">Market Data</option>
              <option value="risk">Risk Profile</option>
              <option value="system">System Info</option>
            </select>
          </div>

          <Button
            onClick={addKnowledgeItem}
            disabled={isLoading || !newItem.title || !newItem.content}
            className="w-full"
          >
            {isLoading ? 'Adding...' : 'Add Knowledge'}
          </Button>
        </CardContent>
      </Card>

      {/* Knowledge Library */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
            />

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge className={getTypeColor(item.type)}>
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{item.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                        <Badge variant="outline">
                          Relevance: {item.relevance.toFixed(1)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
