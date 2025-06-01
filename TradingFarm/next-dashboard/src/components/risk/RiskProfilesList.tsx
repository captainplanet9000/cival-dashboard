/**
 * Risk Profiles List Component
 * Manages risk profiles for trading and ElizaOS agents
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, Shield, Users, Plus, Copy, Trash,
  Settings, Eye, RefreshCw, Check, ChevronRight
} from 'lucide-react';
import { enhancedRiskService, RiskProfileRecord } from '@/services/enhanced-risk-service';
import { RiskProfileForm } from './RiskProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function RiskProfilesList() {
  const [profiles, setProfiles] = useState<RiskProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<RiskProfileRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    loadRiskProfiles();
  }, []);
  
  const loadRiskProfiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await enhancedRiskService.getRiskProfiles();
      
      if (response.success && response.data) {
        setProfiles(response.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while loading risk profiles');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateProfile = async (profileData: Partial<RiskProfileRecord>) => {
    try {
      const response = await enhancedRiskService.createRiskProfile(profileData as any);
      
      if (response.success && response.data) {
        setProfiles(prev => [response.data, ...prev]);
        setIsCreateDialogOpen(false);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while creating the risk profile');
    }
  };
  
  const handleUpdateProfile = async (profileData: Partial<RiskProfileRecord>) => {
    if (!selectedProfile) return;
    
    try {
      const response = await enhancedRiskService.updateRiskProfile(
        selectedProfile.id,
        profileData as any
      );
      
      if (response.success && response.data) {
        setProfiles(prev => prev.map(profile => 
          profile.id === selectedProfile.id ? response.data : profile
        ));
        setIsEditDialogOpen(false);
        setSelectedProfile(null);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while updating the risk profile');
    }
  };
  
  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    
    try {
      const response = await enhancedRiskService.deleteRiskProfile(selectedProfile.id);
      
      if (response.success) {
        setProfiles(prev => prev.filter(profile => profile.id !== selectedProfile.id));
        setIsDeleteDialogOpen(false);
        setSelectedProfile(null);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while deleting the risk profile');
    }
  };
  
  const handleDuplicateProfile = (profile: RiskProfileRecord) => {
    setSelectedProfile({
      ...profile,
      id: 'new',
      name: `Copy of ${profile.name}`,
      is_default: false
    });
    setIsCreateDialogOpen(true);
  };
  
  const openEditDialog = (profile: RiskProfileRecord) => {
    setSelectedProfile(profile);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (profile: RiskProfileRecord) => {
    setSelectedProfile(profile);
    setIsDeleteDialogOpen(true);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Profiles</CardTitle>
          <CardDescription>Loading profiles...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 border-b pb-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get default and custom profiles
  const defaultProfiles = profiles.filter(p => p.is_default);
  const customProfiles = profiles.filter(p => !p.is_default);
  
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Risk Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Configure risk parameters for different trading scenarios
          </p>
        </div>
        
        <Button onClick={() => {
          setSelectedProfile(null);
          setIsCreateDialogOpen(true);
        }} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>New Profile</span>
        </Button>
      </div>
      
      <Tabs defaultValue="custom">
        <TabsList>
          <TabsTrigger value="custom" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Custom Profiles</span>
            <Badge variant="secondary" className="ml-1">{customProfiles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="default" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Default Profiles</span>
            <Badge variant="secondary" className="ml-1">{defaultProfiles.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="custom">
          <Card>
            <CardContent className="pt-6">
              {customProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No Custom Profiles</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Create your own risk profiles to customize trading parameters
                  </p>
                  <Button 
                    onClick={() => {
                      setSelectedProfile(null);
                      setIsCreateDialogOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Profile</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customProfiles.map(profile => (
                    <div 
                      key={profile.id} 
                      className="flex flex-col sm:flex-row sm:items-center border rounded-lg p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium">{profile.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {profile.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleDuplicateProfile(profile)}
                        >
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Duplicate</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditDialog(profile)}
                        >
                          <Settings className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openDeleteDialog(profile)}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 pl-2 pr-1"
                        >
                          <span className="mr-1">View</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="default">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {defaultProfiles.map(profile => (
                  <div 
                    key={profile.id} 
                    className="flex flex-col sm:flex-row sm:items-center border rounded-lg p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{profile.name}</h3>
                          <Badge variant="secondary">Default</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {profile.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={() => handleDuplicateProfile(profile)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        <span>Duplicate</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 pl-2 pr-1"
                      >
                        <span className="mr-1">View</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Risk Profile</DialogTitle>
            <DialogDescription>
              Configure a new risk profile for trading
            </DialogDescription>
          </DialogHeader>
          
          <RiskProfileForm 
            initialData={selectedProfile || undefined}
            onSubmit={handleCreateProfile}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Risk Profile</DialogTitle>
            <DialogDescription>
              Modify risk profile settings
            </DialogDescription>
          </DialogHeader>
          
          {selectedProfile && (
            <RiskProfileForm 
              initialData={selectedProfile}
              onSubmit={handleUpdateProfile}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Risk Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this risk profile?
            </DialogDescription>
          </DialogHeader>
          
          {selectedProfile && (
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Deleting "{selectedProfile.name}" is permanent and cannot be undone.
                  Any associated risk parameters will be reset to default values.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProfile}
            >
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
