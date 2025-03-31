'use client';

import React, { useState, useEffect } from 'react';
import { elizaClient, KnowledgeItem } from '@/utils/eliza/eliza-client';
import { Search, PlusCircle, Tag, Database, Clock, Trash2, Edit, Check, X } from 'lucide-react';

interface KnowledgeManagerProps {
  agentId?: number;
  farmId?: number;
  allowEdit?: boolean;
}

export default function KnowledgeManager({ agentId, farmId, allowEdit = true }: KnowledgeManagerProps) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState<number | null>(null);
  
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemTags, setNewItemTags] = useState('');
  
  // Load knowledge
  useEffect(() => {
    loadKnowledge();
  }, [agentId, farmId]);

  const loadKnowledge = async () => {
    setIsLoading(true);
    
    try {
      // If an agent ID is provided, load knowledge for that agent
      // Otherwise, load all knowledge
      const response = await fetch('/api/mcp/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_knowledge',
          params: {
            agent_id: agentId,
            farm_id: farmId
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setKnowledge(result.data);
        
        // Extract all unique tags
        const tags = new Set<string>();
        result.data.forEach((item: KnowledgeItem) => {
          item.tags.forEach(tag => tags.add(tag));
        });
        
        setAllTags(Array.from(tags));
      } else {
        console.error('Error loading knowledge:', result.error);
      }
    } catch (error) {
      console.error('Error loading knowledge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNewItem = async () => {
    if (!newItemTitle.trim() || !newItemContent.trim()) return;
    
    // Split tags by comma and trim whitespace
    const tags = newItemTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
    
    try {
      const result = await elizaClient.storeKnowledge(
        newItemTitle,
        newItemContent,
        tags,
        agentId ? [agentId] : []
      );
      
      if (result.success) {
        resetNewItemForm();
        setIsAddingItem(false);
        loadKnowledge();
      } else {
        console.error('Error saving knowledge item:', result.error);
      }
    } catch (error) {
      console.error('Error saving knowledge item:', error);
    }
  };

  const handleUpdateItem = async (itemId: number) => {
    if (!newItemTitle.trim() || !newItemContent.trim()) return;
    
    // Split tags by comma and trim whitespace
    const tags = newItemTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
    
    try {
      const response = await fetch('/api/mcp/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'update_record',
          params: {
            table: 'knowledge_items',
            data: {
              title: newItemTitle,
              content: newItemContent,
              tags
            },
            where: {
              id: itemId
            }
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        resetNewItemForm();
        setIsEditingItem(null);
        loadKnowledge();
      } else {
        console.error('Error updating knowledge item:', result.error);
      }
    } catch (error) {
      console.error('Error updating knowledge item:', error);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;
    
    try {
      const response = await fetch('/api/mcp/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'delete_record',
          params: {
            table: 'knowledge_items',
            where: {
              id: itemId
            }
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        loadKnowledge();
      } else {
        console.error('Error deleting knowledge item:', result.error);
      }
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
    }
  };

  const resetNewItemForm = () => {
    setNewItemTitle('');
    setNewItemContent('');
    setNewItemTags('');
  };

  const handleEditItem = (item: KnowledgeItem) => {
    setNewItemTitle(item.title);
    setNewItemContent(item.content);
    setNewItemTags(item.tags.join(', '));
    setIsEditingItem(item.id!);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Filter knowledge items based on search query and selected tags
  const filteredKnowledge = knowledge.filter(item => {
    // Filter by search query
    const matchesQuery = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Filter by selected tags
    const matchesTags = selectedTags.length > 0
      ? selectedTags.every(tag => item.tags.includes(tag))
      : true;
    
    return matchesQuery && matchesTags;
  });

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h3 className="font-medium">Knowledge Management</h3>
        </div>
        
        {allowEdit && (
          <button
            onClick={() => {
              resetNewItemForm();
              setIsAddingItem(!isAddingItem);
              setIsEditingItem(null);
            }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-2"
          >
            {isAddingItem ? 'Cancel' : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Knowledge
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Search and filters */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search knowledge..."
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  selectedTags.includes(tag)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => toggleTag(tag)}
              >
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Add/Edit knowledge form */}
      {(isAddingItem || isEditingItem !== null) && (
        <div className="p-4 border-b">
          <h4 className="font-medium mb-3">
            {isEditingItem !== null ? 'Edit Knowledge Item' : 'Add New Knowledge Item'}
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter title..."
                value={newItemTitle}
                onChange={e => setNewItemTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="content">
                Content
              </label>
              <textarea
                id="content"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter content..."
                value={newItemContent}
                onChange={e => setNewItemContent(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="tags">
                Tags (comma separated)
              </label>
              <input
                id="tags"
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="trading, strategy, market analysis..."
                value={newItemTags}
                onChange={e => setNewItemTags(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  resetNewItemForm();
                  setIsAddingItem(false);
                  setIsEditingItem(null);
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </button>
              
              <button
                onClick={() => isEditingItem !== null ? handleUpdateItem(isEditingItem) : handleSaveNewItem()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                disabled={!newItemTitle.trim() || !newItemContent.trim()}
              >
                <Check className="mr-2 h-4 w-4" />
                {isEditingItem !== null ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Knowledge list */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredKnowledge.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Database className="h-10 w-10 mb-2 text-muted-foreground" />
            <h4 className="text-lg font-medium">No knowledge items found</h4>
            <p className="text-muted-foreground">
              {searchQuery || selectedTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Add knowledge to help your trading agents make better decisions'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredKnowledge.map(item => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-lg">{item.title}</h4>
                  
                  {allowEdit && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditItem(item)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id!)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="text-sm mb-3 whitespace-pre-wrap">
                  {item.content.length > 200
                    ? `${item.content.substring(0, 200)}...`
                    : item.content}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(item.created_at!).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
