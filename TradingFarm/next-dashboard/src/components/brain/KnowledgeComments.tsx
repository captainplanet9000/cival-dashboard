"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MessageSquare, ThumbsUp, Reply, Trash2, 
  Edit, Clock, User, Users, AlertCircle, Send 
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface KnowledgeCommentsProps {
  brainFileId: string;
  farmId?: string;
}

interface Comment {
  id: string;
  brain_file_id: string;
  user_id: string;
  text: string;
  is_resolved: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  likes: number;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
  replies?: Comment[];
  isEditing?: boolean;
}

export function KnowledgeComments({ brainFileId, farmId }: KnowledgeCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  // Fetch comments for the brain file
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ["knowledgeComments", brainFileId],
    queryFn: async () => {
      try {
        // In a real implementation, fetch from database
        // For demo, return mock data
        await new Promise(r => setTimeout(r, 800)); // Simulate loading
        
        const mockComments: Comment[] = [
          {
            id: "1",
            brain_file_id: brainFileId,
            user_id: "user1",
            text: "This documentation on moving average strategies is very helpful, but I think we should add more examples with different parameter settings.",
            is_resolved: false,
            parent_id: null,
            created_at: "2025-04-11T14:23:45Z",
            updated_at: "2025-04-11T14:23:45Z",
            likes: 3,
            user: {
              id: "user1",
              email: "maria@tradingfarm.com",
              full_name: "Maria Rodriguez"
            },
            replies: [
              {
                id: "2",
                brain_file_id: brainFileId,
                user_id: "user2",
                text: "I agree! Especially adding examples with different timeframes would be beneficial for new traders.",
                is_resolved: false,
                parent_id: "1",
                created_at: "2025-04-11T15:10:22Z",
                updated_at: "2025-04-11T15:10:22Z",
                likes: 1,
                user: {
                  id: "user2",
                  email: "alex@tradingfarm.com",
                  full_name: "Alex Chen"
                }
              }
            ]
          },
          {
            id: "3",
            brain_file_id: brainFileId,
            user_id: "user3",
            text: "I've found that the strategy performs poorly in high volatility conditions. Should we add a section on volatility filters?",
            is_resolved: false,
            parent_id: null,
            created_at: "2025-04-10T09:45:12Z",
            updated_at: "2025-04-10T09:45:12Z",
            likes: 5,
            user: {
              id: "user3",
              email: "james@tradingfarm.com",
              full_name: "James Wilson"
            },
            replies: []
          }
        ];
        
        return mockComments;
      } catch (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: { text: string; parentId: string | null }) => {
      try {
        // In a real implementation, save to database
        await new Promise(r => setTimeout(r, 500)); // Simulate API call
        
        // Return a mock new comment
        return {
          id: `new-${Date.now()}`,
          brain_file_id: brainFileId,
          user_id: "current-user",
          text: comment.text,
          is_resolved: false,
          parent_id: comment.parentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes: 0,
          user: {
            id: "current-user",
            email: "you@tradingfarm.com",
            full_name: "Current User"
          }
        };
      } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
      }
    },
    onSuccess: (newComment, variables) => {
      queryClient.setQueryData(
        ["knowledgeComments", brainFileId],
        (oldData: Comment[] = []) => {
          if (variables.parentId) {
            // Add reply to existing comment
            return oldData.map(comment => {
              if (comment.id === variables.parentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), newComment]
                };
              }
              return comment;
            });
          } else {
            // Add new top-level comment
            return [...oldData, newComment];
          }
        }
      );
      
      // Reset form
      setNewComment("");
      setReplyText("");
      setReplyToId(null);
      
      toast({
        title: "Comment added",
        description: "Your comment has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding comment",
        description: "Failed to add your comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      try {
        // In a real implementation, update in database
        await new Promise(r => setTimeout(r, 500)); // Simulate API call
        return { id: commentId, text };
      } catch (error) {
        console.error("Error editing comment:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["knowledgeComments", brainFileId],
        (oldData: Comment[] = []) => {
          // Update comment text in the data
          return oldData.map(comment => {
            if (comment.id === result.id) {
              return { ...comment, text: result.text };
            }
            
            // Check replies
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply => 
                  reply.id === result.id 
                    ? { ...reply, text: result.text } 
                    : reply
                )
              };
            }
            
            return comment;
          });
        }
      );
      
      // Reset state
      setEditingId(null);
      setEditText("");
      
      toast({
        title: "Comment updated",
        description: "Your comment has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating comment",
        description: "Failed to update your comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      try {
        // In a real implementation, delete from database
        await new Promise(r => setTimeout(r, 500)); // Simulate API call
        return commentId;
      } catch (error) {
        console.error("Error deleting comment:", error);
        throw error;
      }
    },
    onSuccess: (commentId) => {
      queryClient.setQueryData(
        ["knowledgeComments", brainFileId],
        (oldData: Comment[] = []) => {
          // Filter out the deleted comment if it's top-level
          const filteredData = oldData.filter(comment => comment.id !== commentId);
          
          // Or remove from replies if it's a reply
          return filteredData.map(comment => {
            if (comment.replies && comment.replies.some(reply => reply.id === commentId)) {
              return {
                ...comment,
                replies: comment.replies.filter(reply => reply.id !== commentId)
              };
            }
            return comment;
          });
        }
      );
      
      toast({
        title: "Comment deleted",
        description: "The comment has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting comment",
        description: "Failed to delete the comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate({
      text: newComment.trim(),
      parentId: null
    });
  };

  const handleAddReply = () => {
    if (!replyText.trim() || !replyToId) return;
    
    addCommentMutation.mutate({
      text: replyText.trim(),
      parentId: replyToId
    });
  };

  const handleStartEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    
    editCommentMutation.mutate({
      commentId: editingId,
      text: editText.trim()
    });
  };

  const handleLikeComment = (commentId: string) => {
    // In a real implementation, this would update the like count in the database
    queryClient.setQueryData(
      ["knowledgeComments", brainFileId],
      (oldData: Comment[] = []) => {
        return oldData.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, likes: comment.likes + 1 };
          }
          
          // Check replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentId 
                  ? { ...reply, likes: reply.likes + 1 } 
                  : reply
              )
            };
          }
          
          return comment;
        });
      }
    );
  };

  // Render a single comment
  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isEditing = editingId === comment.id;
    
    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : 'mb-6'}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={`https://avatar.vercel.sh/${comment.user?.email}?size=32`} />
          <AvatarFallback>
            {comment.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{comment.user?.full_name || 'Anonymous'}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {!isReply && !isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => replyToId === comment.id ? setReplyToId(null) : setReplyToId(comment.id)}
              >
                <Reply className="h-4 w-4" />
                <span className="sr-only">Reply</span>
              </Button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Textarea 
                value={editText} 
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || editCommentMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{comment.text}</p>
          )}
          
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs gap-1" 
                onClick={() => handleLikeComment(comment.id)}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {comment.likes > 0 && comment.likes}
              </Button>
              
              {comment.user_id === "current-user" && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs gap-1" 
                    onClick={() => handleStartEditing(comment)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs gap-1 text-destructive" 
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
          
          {/* Show reply form if replying to this comment */}
          {replyToId === comment.id && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://avatar.vercel.sh/you@tradingfarm.com?size=24" />
                  <AvatarFallback>YO</AvatarFallback>
                </Avatar>
                <Textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setReplyToId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAddReply}
                  disabled={!replyText.trim() || addCommentMutation.isPending}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}
          
          {/* Render replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Comments & Discussions</h3>
          {!isLoading && commentsData && (
            <Badge variant="outline">
              {commentsData.reduce(
                (count, comment) => count + 1 + (comment.replies?.length || 0), 
                0
              )}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>Collaborative</span>
          </Badge>
        </div>
      </div>
      
      {/* Add new comment */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://avatar.vercel.sh/you@tradingfarm.com?size=32" />
            <AvatarFallback>YO</AvatarFallback>
          </Avatar>
          <Textarea
            placeholder="Add a comment or annotation..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            {addCommentMutation.isPending ? (
              <span className="flex items-center gap-1">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-r-transparent" />
                Posting...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Send className="h-4 w-4" />
                Comment
              </span>
            )}
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Comments list */}
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent mb-2" />
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        </div>
      ) : commentsData && commentsData.length > 0 ? (
        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {commentsData.map(comment => renderComment(comment))}
          </div>
        </ScrollArea>
      ) : (
        <div className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to comment on this knowledge asset
          </p>
        </div>
      )}
    </div>
  );
}
