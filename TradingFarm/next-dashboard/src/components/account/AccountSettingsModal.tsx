'use client';

import React from 'react';
import { useAccountSettings, UserProfile } from '@/hooks/useAccountSettings';
import { passwordUpdateSchema, accountProfileSchema, validateForm, getFieldError, ValidationError } from '@/utils/formValidation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Shield,
  Settings,
  CreditCard,
  Save,
  AlertTriangle,
  Bell,
  Moon,
  Sun,
  Eye,
  EyeOff,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { logEvent } from '@/utils/logging';

interface AccountSettingsModalProps {
  section?: 'profile' | 'security' | 'preferences' | 'billing';
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSettingsModal({ section = 'profile', isOpen, onClose }: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = React.useState<'profile' | 'security' | 'preferences' | 'billing'>(section);
  const [formErrors, setFormErrors] = React.useState<ValidationError[]>([]);
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Use our custom hook to fetch and manage user profile data
  const {
    profile, 
    loading, 
    saving,
    error,
    updateProfile,
    updatePassword,
    enableTwoFactor
  } = useAccountSettings();
  
  // Create a local state copy of the profile for form editing
  const [formData, setFormData] = React.useState<Partial<UserProfile>>({
    name: '',
    email: '',
    timezone: '',
    theme: 'dark',
    default_exchange: '',
    default_leverage: 5,
    notifications_settings: {
      email: true,
      push: true,
      trading_alerts: true,
      market_updates: false,
      security_alerts: true,
      newsletter_updates: false
    },
    trading_preferences: {
      confirm_trades: true,
      show_pnl_in_header: true,
      compact_view: false
    },
    security_settings: {
      two_factor_enabled: false,
      session_timeout: 30
    }
  });

  // Sync profile data to form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  // Handle input change
  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevData: Partial<UserProfile>) => ({
      ...prevData,
      [field]: e.target.value
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'profile' | 'security' | 'preferences' | 'billing');
  };

  React.useEffect(() => {
    if (isOpen) {
      // Log view event
      logEvent({
        category: 'account',
        action: 'view_settings',
        label: activeTab,
        value: 1
      });
    }
  }, [isOpen, activeTab]);

  // Handle saving profile changes
  const handleSaveProfile = async () => {
    // Validate the form before submission
    const validationResult = validateForm(accountProfileSchema, {
      name: formData.name,
      email: formData.email,
      timezone: formData.timezone,
      theme: formData.theme
    });
    
    if (!validationResult.success) {
      setFormErrors(validationResult.errors || []);
      return;
    }
    
    // Clear validation errors
    setFormErrors([]);
    
    // Update profile using the hook
    const success = await updateProfile(formData);
    
    if (success) {
      onClose();
    }
  };

  // Handle password update
  const handlePasswordUpdate = async () => {
    // Validate password form
    const validationResult = validateForm(passwordUpdateSchema, passwordForm);
    
    if (!validationResult.success) {
      setFormErrors(validationResult.errors || []);
      return;
    }
    
    // Clear validation errors
    setFormErrors([]);
    
    // Update password using the hook
    const success = await updatePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );
    
    if (success) {
      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  // Handle toggles for boolean settings
  const handleToggleChange = (category: 'notifications_settings' | 'trading_preferences' | 'security_settings', field: string) => {
    setFormData((prev: Partial<UserProfile>) => {
      if (!prev[category]) return prev;
      
      const settings = prev[category] as Record<string, boolean>;
      const newSettings = { ...settings };
      newSettings[field] = !newSettings[field];
      
      return {
        ...prev,
        [category]: newSettings
      };
    });
  };

  // Handle number input change (for things like leverage, timeouts)
  const handleNumberChange = (field: string) => (value: string | number) => {
    setFormData((prev: Partial<UserProfile>) => ({
      ...prev,
      [field]: Number(value)
    }));
  };

  // Handle select input change
  const handleSelectChange = (section: string) => (value: string) => {
    const newFormData = {...formData};
    if (section === 'billing' && newFormData.billing) {
      newFormData.billing.plan = value;
    }
    setFormData(newFormData);
  };

  // Handle password form change
  const handlePasswordFormChange = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordForm(prev => ({
        ...prev,
        [field]: e.target.value
      }));
    };

  const saveChanges = (section: string) => {
    if (section === 'profile') {
      handleSaveProfile();
    } else if (section === 'security') {
      handlePasswordUpdate();
    } else {
      // For other sections
      updateProfile(formData);
    }
  };
  
  // Handle previous state in state updates
  const updateFormData = (field: keyof UserProfile, value: any, prev: UserProfile) => {
    return {...prev, [field]: value};
  };

  // Get error message for a field
  const getError = (field: string): string | undefined => {
    return getFieldError(formErrors, field);
  };

  // Custom Dialog component wrapper to fix TypeScript issues
  function DialogWrapper({ children, open, onOpenChange }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) {
    const Dialog = require('@radix-ui/react-dialog').Root;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    );
  }

  return (
    <DialogWrapper open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Configure your profile, security, preferences, and billing options
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="profile" className="flex items-center justify-center">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center justify-center">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center justify-center">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center justify-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Your full name"
                      className="w-full"
                      value={formData.name || ''}
                      onChange={handleInputChange('name')}
                    />
                    {getError('name') && (
                      <p className="text-sm text-red-500">{getError('name')}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Your email address"
                      className="w-full"
                      value={formData.email || ''}
                      onChange={handleInputChange('email')}
                    />
                    {getError('email') && (
                      <p className="text-sm text-red-500">{getError('email')}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={formData.timezone || ''} 
                    onValueChange={handleSelectChange('timezone')}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">Greenwich Mean Time (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Japan Standard Time (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button onClick={() => saveChanges('profile')} disabled={loading}>
                {loading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        {formData.security_settings?.two_factor_enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={enableTwoFactor}
                      disabled={saving || formData.security_settings?.two_factor_enabled}
                    >
                      {formData.security_settings?.two_factor_enabled ? "Enabled" : "Enable"}
                    </Button>
                  </div>
                </div>
                
                {formData.security_settings?.two_factor_enabled && (
                  <>
                    <Separator />
                    <div>
                      <Button variant="outline" size="sm" className="mr-2">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Setup Authenticator App
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate New Backup Codes
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>Manage your active sessions and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Last Login</div>
                  <div className="last-login-info text-sm text-muted-foreground">
                    <div>Last login: {formData.security_settings?.lastLogin ? new Date(formData.security_settings.lastLogin).toLocaleString() : 'Unknown'}</div>
                    <div>IP Address: {formData.security_settings?.lastIpAddress || 'Unknown'}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Select 
                    value={formData.security_settings?.sessionTimeout.toString()} 
                    onValueChange={handleNumberChange('sessionTimeout')}
                  >
                    <SelectTrigger id="sessionTimeout">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultLeverage">Default Leverage</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="defaultLeverage"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.security_settings?.defaultLeverage || 1}
                      onChange={(e) => {
                        const newFormData = { ...formData };
                        if (newFormData.security_settings) {
                          newFormData.security_settings.defaultLeverage = parseInt(e.target.value);
                          setFormData(newFormData);
                        }
                      }}
                      className="w-24"
                    />
                    <span>x</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email-notifications"
                    checked={formData.notifications?.email || false}
                    onCheckedChange={(checked) => {
                      const newFormData = {...formData};
                      if (newFormData.notifications) {
                        newFormData.notifications.email = checked;
                      } else {
                        newFormData.notifications = { email: checked };
                      }
                      setFormData(newFormData);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <div className="font-medium">Current Billing Plan</div>
                    <div className="text-sm text-muted-foreground">
                      {formData.billing?.plan || 'Free'} Plan, billed {formData.billing?.billingCycle || 'monthly'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Upgrade Plan
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border">
                  <div>
                    <h3 className="font-bold text-lg">{formData.billing?.plan || 'Free'} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      Billed {formData.billing?.billingCycle === 'monthly' ? 'monthly' : 'annually'}
                    </p>
                    <div className="text-sm">
                      Next billing date: <span className="font-medium">
                        {formData.billing?.nextBillingDate ? new Date(formData.billing.nextBillingDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline">Change Plan</Button>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Payment Method</div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span>{formData.billing?.paymentMethod || 'No payment method on file'}</span>
                    </div>
                    <Button variant="ghost" size="sm">Update</Button>
                  </div>
                </div>
                
                <div className="text-sm">
                  Payment method: <span className="font-medium">
                    {formData.billing?.paymentMethod || 'No payment method on file'}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Cancel Subscription
                </CardTitle>
                <CardDescription>
                  Please note that cancelling your subscription will limit your access to features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive">
                  Cancel Subscription
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </DialogWrapper>
  );
}
