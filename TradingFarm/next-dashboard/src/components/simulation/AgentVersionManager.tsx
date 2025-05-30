"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Tag, Download, RotateCcw, CheckCircle, AlertTriangle, 
  Copy, Star, StarOff, ArrowUpDown, FileDown, 
  GitBranch, GitMerge, GitCommit, Search
} from "lucide-react";

interface AgentVersion {
  id: string;
  name: string;
  version: string;
  algorithm: string;
  status: "active" | "archived" | "testing" | "production";
  stage: string;
  performance: {
    sharpeRatio: number;
    winRate: number;
    profitFactor: number;
    totalReturn: number;
    maxDrawdown: number;
  };
  createdAt: string;
  createdBy: string;
  description: string;
  tags: string[];
  parentVersion?: string;
  isFavorite: boolean;
}

interface AgentVersionManagerProps {
  onSelectVersion?: (versionId: string) => void;
  onPromoteVersion?: (versionId: string, targetStage: string) => void;
  onExportVersion?: (versionId: string) => void;
  onRollbackVersion?: (versionId: string) => void;
  selectedVersionId?: string;
}

export function AgentVersionManager({
  onSelectVersion,
  onPromoteVersion,
  onExportVersion,
  onRollbackVersion,
  selectedVersionId
}: AgentVersionManagerProps) {
  // Sample agent versions
  const [versions, setVersions] = useState<AgentVersion[]>([
    {
      id: "v-001",
      name: "Momentum Alpha",
      version: "1.0.0",
      algorithm: "PPO",
      status: "production",
      stage: "Production",
      performance: {
        sharpeRatio: 1.85,
        winRate: 62.3,
        profitFactor: 2.1,
        totalReturn: 78.4,
        maxDrawdown: 12.8
      },
      createdAt: "2025-04-01T12:00:00.000Z",
      createdBy: "John Smith",
      description: "Initial production version with momentum-based strategy",
      tags: ["momentum", "production", "stable"],
      isFavorite: true
    },
    {
      id: "v-002",
      name: "Momentum Beta",
      version: "1.1.0",
      algorithm: "PPO",
      status: "testing",
      stage: "Validation",
      performance: {
        sharpeRatio: 1.92,
        winRate: 63.5,
        profitFactor: 2.3,
        totalReturn: 82.1,
        maxDrawdown: 11.5
      },
      createdAt: "2025-04-05T15:30:00.000Z",
      createdBy: "John Smith",
      description: "Enhanced version with improved parameter tuning",
      tags: ["momentum", "testing", "improved"],
      parentVersion: "v-001",
      isFavorite: false
    },
    {
      id: "v-003",
      name: "Mean Reversion Alpha",
      version: "1.0.0",
      algorithm: "A2C",
      status: "active",
      stage: "Training",
      performance: {
        sharpeRatio: 1.62,
        winRate: 58.7,
        profitFactor: 1.9,
        totalReturn: 65.3,
        maxDrawdown: 14.2
      },
      createdAt: "2025-04-10T09:15:00.000Z",
      createdBy: "Sarah Lee",
      description: "New strategy focusing on mean reversion patterns",
      tags: ["mean-reversion", "development", "experimental"],
      isFavorite: true
    },
    {
      id: "v-004",
      name: "Hybrid Strategy",
      version: "0.5.0",
      algorithm: "SAC",
      status: "archived",
      stage: "Development",
      performance: {
        sharpeRatio: 1.28,
        winRate: 52.1,
        profitFactor: 1.5,
        totalReturn: 45.8,
        maxDrawdown: 18.3
      },
      createdAt: "2025-03-15T14:20:00.000Z",
      createdBy: "Alex Wong",
      description: "Experimental hybrid strategy - archived due to high drawdowns",
      tags: ["hybrid", "archived", "experimental"],
      isFavorite: false
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AgentVersion | null>(null);
  const [newTag, setNewTag] = useState("");
  
  // Toggle favorite status
  const toggleFavorite = (versionId: string) => {
    setVersions(prevVersions => 
      prevVersions.map(v => 
        v.id === versionId ? { ...v, isFavorite: !v.isFavorite } : v
      )
    );
  };
  
  // Add tag to version
  const addTag = (version: AgentVersion, tag: string) => {
    if (!tag.trim() || version.tags.includes(tag)) return;
    
    setVersions(prevVersions => 
      prevVersions.map(v => 
        v.id === version.id ? { ...v, tags: [...v.tags, tag] } : v
      )
    );
    setNewTag("");
  };
  
  // Remove tag from version
  const removeTag = (version: AgentVersion, tag: string) => {
    setVersions(prevVersions => 
      prevVersions.map(v => 
        v.id === version.id ? { ...v, tags: v.tags.filter(t => t !== tag) } : v
      )
    );
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Filter and sort versions
  const filteredVersions = versions
    .filter(version => {
      // Filter by search query
      const matchesSearch = 
        version.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        version.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        version.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by status
      const matchesStatus = 
        statusFilter === "all" || 
        version.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === "createdAt") {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      } else if (sortField === "name") {
        return sortDirection === "asc" 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (sortField === "performance") {
        return sortDirection === "asc"
          ? a.performance.sharpeRatio - b.performance.sharpeRatio
          : b.performance.sharpeRatio - a.performance.sharpeRatio;
      }
      return 0;
    });
  
  // Get version status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "production":
        return <Badge className="bg-green-500">Production</Badge>;
      case "testing":
        return <Badge variant="secondary">Testing</Badge>;
      case "active":
        return <Badge className="bg-blue-500">Active</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Agent Version Manager</CardTitle>
            <CardDescription>
              Track and manage agent versions through the training pipeline
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <GitBranch className="h-4 w-4 mr-2" />
              Create Branch
            </Button>
            <Button variant="default" size="sm">
              <GitCommit className="h-4 w-4 mr-2" />
              Create Version
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <div className="flex gap-2 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search versions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <GitBranch className="h-4 w-4 mr-2" />
              Compare
            </Button>
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortDirection === "asc" ? "Oldest First" : "Newest First"}
            </Button>
          </div>
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name/Version
                    {sortField === "name" && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort("performance")}
                >
                  <div className="flex items-center justify-end">
                    Performance
                    {sortField === "performance" && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center">
                    Created
                    {sortField === "createdAt" && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVersions.map((version) => (
                <TableRow
                  key={version.id}
                  className={version.id === selectedVersionId ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(version.id)}
                      className="h-7 w-7"
                    >
                      {version.isFavorite ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{version.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>v{version.version}</span>
                      <span>•</span>
                      <span>{version.algorithm}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(version.status)}
                    <div className="text-xs text-muted-foreground mt-1">{version.stage}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">SR: {version.performance.sharpeRatio.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {version.performance.totalReturn.toFixed(1)}% / {version.performance.winRate.toFixed(1)}% WR
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">{formatDate(version.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">{version.createdBy}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {version.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {version.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{version.tags.length - 2}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          setSelectedVersion(version);
                          setShowTagsDialog(true);
                        }}
                      >
                        <Tag className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onSelectVersion && onSelectVersion(version.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onExportVersion && onExportVersion(version.id)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onRollbackVersion && onRollbackVersion(version.id)}
                        disabled={version.status === "production"}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVersions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No versions found matching your search or filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Tags Dialog */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags for {selectedVersion?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="New tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <Button 
                onClick={() => selectedVersion && addTag(selectedVersion, newTag)}
                disabled={!newTag.trim()}
              >
                Add Tag
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedVersion?.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="px-2 py-1">
                  {tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1"
                    onClick={() => selectedVersion && removeTag(selectedVersion, tag)}
                  >
                    <AlertTriangle className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {selectedVersion?.tags.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No tags added yet.
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
