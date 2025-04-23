'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  Copy, 
  ChevronRight,
  Star,
  StarOff
} from 'lucide-react';
import { RiskLevel, RiskProfile } from '@/lib/risk/types';
import { RiskProfileEditor } from './RiskProfileEditor';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';

interface RiskProfileCardProps {
  profile: RiskProfile;
  onUpdate: () => void;
  onDelete: () => void;
  onSetDefault: (profileId: string) => void;
}

const getRiskLevelIcon = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.CONSERVATIVE:
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    case RiskLevel.MODERATE:
      return <Shield className="h-5 w-5 text-blue-500" />;
    case RiskLevel.AGGRESSIVE:
      return <ShieldAlert className="h-5 w-5 text-red-500" />;
    default:
      return <Shield className="h-5 w-5 text-purple-500" />;
  }
};

const getRiskLevelBadge = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.CONSERVATIVE:
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Conservative</Badge>;
    case RiskLevel.MODERATE:
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Moderate</Badge>;
    case RiskLevel.AGGRESSIVE:
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Aggressive</Badge>;
    default:
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Custom</Badge>;
  }
};

export function RiskProfileCard({ profile, onUpdate, onDelete, onSetDefault }: RiskProfileCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('risk_profiles')
        .delete()
        .eq('id', profile.id);
      
      if (error) throw error;
      
      toast({
        title: 'Profile Deleted',
        description: `Risk profile "${profile.name}" has been deleted.`,
      });
      
      onDelete();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete risk profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async () => {
    if (profile.isDefault) return;
    
    try {
      const { error } = await supabase
        .from('risk_profiles')
        .update({ is_default: true })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      toast({
        title: 'Default Profile Updated',
        description: `"${profile.name}" is now your default risk profile.`,
      });
      
      onSetDefault(profile.id);
    } catch (error) {
      console.error('Error setting default profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to set as default profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicatedProfile = {
        name: `${profile.name} (Copy)`,
        description: profile.description,
        level: profile.level,
        parameters: profile.parameters,
        is_default: false,
        user_id: profile.userId
      };
      
      const { error } = await supabase
        .from('risk_profiles')
        .insert(duplicatedProfile);
      
      if (error) throw error;
      
      toast({
        title: 'Profile Duplicated',
        description: `Risk profile has been duplicated as "${duplicatedProfile.name}".`,
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error duplicating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate risk profile. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Card className={profile.isDefault ? 'border-blue-500' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {getRiskLevelIcon(profile.level)}
            <CardTitle className="ml-2">{profile.name}</CardTitle>
          </div>
          {profile.isDefault && (
            <Badge variant="outline" className="ml-2 border-blue-500 text-blue-600">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Default
            </Badge>
          )}
        </div>
        <CardDescription>{profile.description || 'No description provided'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Risk Level</span>
            {getRiskLevelBadge(profile.level)}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Position Size</span>
              <span className="font-medium">{profile.parameters.maxPositionSize}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stop Loss</span>
              <span className="font-medium">{profile.parameters.stopLossPercentage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="font-medium">{profile.parameters.maxDrawdownPercentage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Open Positions</span>
              <span className="font-medium">{profile.parameters.maxOpenPositions}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="flex space-x-2">
          <Sheet open={isEditing} onOpenChange={setIsEditing}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[600px] sm:w-[540px]" side="right">
              <SheetHeader>
                <SheetTitle>Edit Risk Profile</SheetTitle>
                <SheetDescription>
                  Update your risk management parameters
                </SheetDescription>
              </SheetHeader>
              <RiskProfileEditor 
                profile={profile} 
                onSave={() => {
                  setIsEditing(false);
                  onUpdate();
                }}
                onCancel={() => setIsEditing(false)}
              />
            </SheetContent>
          </Sheet>
          
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-1" />
            Duplicate
          </Button>
        </div>
        
        <div className="flex space-x-2">
          {!profile.isDefault && (
            <Button variant="outline" size="sm" onClick={handleSetDefault}>
              <Star className="h-4 w-4 mr-1" />
              Set Default
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600" 
                  onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
