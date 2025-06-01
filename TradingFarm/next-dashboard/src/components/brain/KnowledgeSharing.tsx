"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Share2, Users, Shield, Mail, Copy, Link, 
  Check, AlertCircle, Search, FileText, Clock, 
  UserPlus, Globe, Lock, Eye, UserX 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface KnowledgeSharingProps {
  brainFileId?: string;  // Optional - if not provided, shows all shared files
  farmId?: string;
}

interface SharedUser {
  id: string;
  email: string;
  full_name?: string;
  access_level: 'view' | 'edit' | 'admin';
  invited_at: string;
  status: 'accepted' | 'pending' | 'declined';
}

interface ShareableFile {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  visibility: 'private' | 'shared' | 'public';
  owner: {
    id: string;
    name: string;
    email: string;
  };
  shared_with: SharedUser[];
  created_at: string;
  updated_at: string;
}

export function KnowledgeSharing({ brainFileId, farmId }: KnowledgeSharingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ShareableFile | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState("view");
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [filter, setFilter] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  // Fetch shareable files
  const { data: shareableFiles, isLoading } = useQuery({
    queryKey: ["shareableFiles", brainFileId, farmId],
    queryFn: async () => {
      try {
        // In real implementation, fetch from database
        // For demo, return mock data
        await new Promise(r => setTimeout(r, 800)); // Simulate loading
        
        // If brainFileId is provided, only show that file
        const mockFiles: ShareableFile[] = [
          {
            id: "file1",
            title: "Moving Average Crossover Strategy",
            file_name: "moving_average_crossover.pdf", 
            file_type: "pdf",
            visibility: "shared",
            owner: {
              id: "user1",
              name: "Maria Rodriguez",
              email: "maria@tradingfarm.com"
            },
            shared_with: [
              {
                id: "user2",
                email: "alex@tradingfarm.com",
                full_name: "Alex Chen",
                access_level: "edit",
                invited_at: "2025-04-10T14:23:45Z",
                status: "accepted"
              },
              {
                id: "user3",
                email: "james@tradingfarm.com",
                full_name: "James Wilson",
                access_level: "view",
                invited_at: "2025-04-11T09:12:33Z",
                status: "pending"
              }
            ],
            created_at: "2025-04-09T10:15:22Z",
            updated_at: "2025-04-11T16:45:12Z"
          },
          {
            id: "file2",
            title: "Risk Management Best Practices",
            file_name: "risk_management.docx",
            file_type: "docx",
            visibility: "private",
            owner: {
              id: "current-user",
              name: "Current User",
              email: "you@tradingfarm.com"
            },
            shared_with: [],
            created_at: "2025-04-08T13:42:18Z",
            updated_at: "2025-04-08T13:42:18Z"
          },
          {
            id: "file3",
            title: "Volatility Analysis Methods",
            file_name: "volatility_analysis.pdf",
            file_type: "pdf",
            visibility: "public",
            owner: {
              id: "user4",
              name: "Lisa Chen",
              email: "lisa@tradingfarm.com"
            },
            shared_with: [
              {
                id: "current-user",
                email: "you@tradingfarm.com",
                full_name: "Current User",
                access_level: "view",
                invited_at: "2025-04-07T11:34:21Z",
                status: "accepted"
              }
            ],
            created_at: "2025-04-06T17:23:45Z",
            updated_at: "2025-04-07T09:15:33Z"
          }
        ];
        
        if (brainFileId) {
          return mockFiles.filter(file => file.id === brainFileId);
        }
        
        return mockFiles;
      } catch (error) {
        console.error("Error fetching shareable files:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Share file mutation
  const shareFileMutation = useMutation({
    mutationFn: async ({ fileId, email, accessLevel }: { fileId: string; email: string; accessLevel: string }) => {
      try {
        // In a real implementation, save to database
        await new Promise(r => setTimeout(r, 800)); // Simulate API call
        
        // Return mock data for the new shared user
        return {
          id: `user-${Date.now()}`,
          email: email,
          full_name: email.split('@')[0],
          access_level: accessLevel as 'view' | 'edit' | 'admin',
          invited_at: new Date().toISOString(),
          status: 'pending'
        } as SharedUser;
      } catch (error) {
        console.error("Error sharing file:", error);
        throw error;
      }
    },
    onSuccess: (newSharedUser, variables) => {
      queryClient.setQueryData(
        ["shareableFiles", brainFileId, farmId],
        (oldData: ShareableFile[] = []) => {
          return oldData.map(file => {
            if (file.id === variables.fileId) {
              return {
                ...file,
                shared_with: [...file.shared_with, newSharedUser]
              };
            }
            return file;
          });
        }
      );
      
      // Reset form
      setShareEmail("");
      
      toast({
        title: "File shared",
        description: `An invitation has been sent to ${variables.email}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error sharing file",
        description: "Failed to share the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ fileId, visibility }: { fileId: string; visibility: 'private' | 'shared' | 'public' }) => {
      try {
        // In a real implementation, update in database
        await new Promise(r => setTimeout(r, 500)); // Simulate API call
        return { id: fileId, visibility };
      } catch (error) {
        console.error("Error updating visibility:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["shareableFiles", brainFileId, farmId],
        (oldData: ShareableFile[] = []) => {
          return oldData.map(file => {
            if (file.id === result.id) {
              return { ...file, visibility: result.visibility };
            }
            return file;
          });
        }
      );
      
      toast({
        title: "Visibility updated",
        description: `File is now ${result.visibility}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating visibility",
        description: "Failed to update visibility. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Remove shared user mutation
  const removeSharedUserMutation = useMutation({
    mutationFn: async ({ fileId, userId }: { fileId: string; userId: string }) => {
      try {
        // In a real implementation, remove from database
        await new Promise(r => setTimeout(r, 500)); // Simulate API call
        return { fileId, userId };
      } catch (error) {
        console.error("Error removing shared user:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["shareableFiles", brainFileId, farmId],
        (oldData: ShareableFile[] = []) => {
          return oldData.map(file => {
            if (file.id === result.fileId) {
              return {
                ...file,
                shared_with: file.shared_with.filter(user => user.id !== result.userId)
              };
            }
            return file;
          });
        }
      );
      
      toast({
        title: "Access removed",
        description: "User's access to the file has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing access",
        description: "Failed to remove user's access. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleShareFile = () => {
    if (!selectedFile || !shareEmail.trim()) return;
    
    shareFileMutation.mutate({
      fileId: selectedFile.id,
      email: shareEmail.trim(),
      accessLevel: shareAccessLevel
    });
  };

  const handleCopyShareLink = (file: ShareableFile) => {
    // In a real implementation, generate a proper sharing link
    const shareLink = `https://tradingfarm.com/share/${file.id}`;
    navigator.clipboard.writeText(shareLink);
    
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
    
    toast({
      title: "Link copied",
      description: "Sharing link has been copied to clipboard.",
    });
  };

  const handleUpdateVisibility = (file: ShareableFile, visibility: 'private' | 'shared' | 'public') => {
    updateVisibilityMutation.mutate({
      fileId: file.id,
      visibility
    });
  };

  const handleRemoveSharedUser = (fileId: string, userId: string) => {
    removeSharedUserMutation.mutate({
      fileId,
      userId
    });
  };

  const openShareDialog = (file: ShareableFile) => {
    setSelectedFile(file);
    setIsShareDialogOpen(true);
  };

  const filteredFiles = shareableFiles?.filter(file => {
    // Apply search filter
    const matchesSearch = searchQuery.trim() === "" ||
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply visibility filter
    const matchesFilter = 
      filter === "all" ||
      (filter === "shared-with-me" && 
        file.owner.id !== "current-user" && 
        file.shared_with.some(u => u.id === "current-user")) ||
      (filter === "shared-by-me" && 
        file.owner.id === "current-user" && 
        file.shared_with.length > 0) ||
      (filter === "public" && file.visibility === "public");
    
    return matchesSearch && matchesFilter;
  });

  // Get visibility icon based on file visibility
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return <Lock className="h-4 w-4" />;
      case 'shared':
        return <Users className="h-4 w-4" />;
      case 'public':
        return <Globe className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Knowledge Sharing</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="shared-with-me">Shared with me</SelectItem>
              <SelectItem value="shared-by-me">Shared by me</SelectItem>
              <SelectItem value="public">Public files</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-[200px]"
            />
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent mb-2" />
          <p className="text-sm text-muted-foreground">Loading shared files...</p>
        </div>
      ) : filteredFiles && filteredFiles.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Shared With</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{file.title}</div>
                          <div className="text-xs text-muted-foreground">{file.file_name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://avatar.vercel.sh/${file.owner.email}?size=24`} />
                          <AvatarFallback>
                            {file.owner.name.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {file.owner.id === "current-user" ? "You" : file.owner.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          file.visibility === 'private' ? 'outline' : 
                          file.visibility === 'shared' ? 'secondary' : 
                          'default'
                        }
                        className="flex gap-1 items-center"
                      >
                        {getVisibilityIcon(file.visibility)}
                        <span className="capitalize">{file.visibility}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {file.shared_with.length > 0 ? (
                        <div className="flex -space-x-2">
                          {file.shared_with.slice(0, 3).map((user) => (
                            <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={`https://avatar.vercel.sh/${user.email}?size=24`} />
                              <AvatarFallback>
                                {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {file.shared_with.length > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                              +{file.shared_with.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not shared</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(file.updated_at), "MMM d, yyyy")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {file.owner.id === "current-user" ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7"
                            onClick={() => openShareDialog(file)}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Share
                          </Button>
                          <Select 
                            value={file.visibility}
                            onValueChange={(value: 'private' | 'shared' | 'public') => 
                              handleUpdateVisibility(file, value)
                            }
                          >
                            <SelectTrigger className="w-[110px] h-7">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">
                                <div className="flex items-center gap-2">
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Private</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="shared">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3.5 w-3.5" />
                                  <span>Shared</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="public">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-3.5 w-3.5" />
                                  <span>Public</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7"
                          onClick={() => handleCopyShareLink(file)}
                        >
                          <Link className="h-3.5 w-3.5 mr-1" />
                          Copy Link
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No shared files found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery.trim() !== "" 
              ? "Try adjusting your search query" 
              : filter !== "all" 
              ? "Try a different filter" 
              : "Share your knowledge files with teammates"}
          </p>
        </div>
      )}
      
      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Knowledge File</DialogTitle>
            <DialogDescription>
              {selectedFile && (
                <div className="flex items-center gap-2 mt-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedFile.title}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  placeholder="colleague@example.com"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
              </div>
              <Select value={shareAccessLevel} onValueChange={setShareAccessLevel}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedFile && selectedFile.shared_with.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Currently shared with</h4>
                <div className="rounded-md border">
                  {selectedFile.shared_with.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://avatar.vercel.sh/${user.email}?size=24`} />
                          <AvatarFallback>
                            {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{user.full_name || user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {user.access_level === 'view' ? 'Viewer' : 
                           user.access_level === 'edit' ? 'Editor' : 'Admin'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveSharedUser(selectedFile.id, user.id)}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="copy-link" className="text-sm">Anyone with the link</Label>
                <Badge variant="outline" className="ml-2">
                  {selectedFile?.visibility === 'public' ? 'Public' : 'Private Link'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="copy-link"
                  value={selectedFile ? `https://tradingfarm.com/share/${selectedFile.id}` : ""}
                  readOnly
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => selectedFile && handleCopyShareLink(selectedFile)}
                >
                  {shareLinkCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="make-public" />
              <Label htmlFor="make-public" className="text-sm">Make file public</Label>
            </div>
            <Button
              type="button"
              onClick={handleShareFile}
              disabled={!shareEmail.trim() || shareFileMutation.isPending}
            >
              {shareFileMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-r-transparent" />
                  Sharing...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Invite
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
