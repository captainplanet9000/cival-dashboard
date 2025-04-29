'use client';

import React from 'react';
import { useAccountSettings, UserProfile } from '@/hooks/useAccountSettings';
import { 
  passwordUpdateSchema, 
  accountProfileSchema, 
  validateForm, 
  getFieldError, 
  ValidationError 
} from '@/utils/formValidation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  User, 
  Settings, 
  Bell, 
  CreditCard, 
  Save, 
  Lock, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { logEvent } from '@/utils/logging';

export interface AccountSettingsModalProps {
  section?: 'profile' | 'security' | 'preferences' | 'billing';
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AccountSettingsModal - A comprehensive settings modal for user account management
 * 
 * This component allows users to manage their profile settings, security preferences,
 * UI preferences, and billing information. It uses the useAccountSettings hook to
 * fetch and update user profile data directly from the database.
 */
export function AccountSettingsModalNew({ section = 'profile', isOpen, onClose }: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = React.useState<'profile' | 'security' | 'preferences' | 'billing'>(section);
  const [formErrors, setFormErrors] = React.useState<ValidationError[]>([]);
  const [showPassword, setShowPassword] = React.useState({
    current: false,
    new: false,
    confirm: false
  });
  
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
      // Log modal open event
      logEvent({
        category: 'modal',
        action: 'open_account_settings',
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

  // Handle select change
  const handleSelectChange = (field: string) => (value: string) => {
    setFormData((prev: Partial<UserProfile>) => ({
      ...prev,
      [field]: value
    }));
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
  
  // Handle password form change
  const handlePasswordFormChange = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((prev: typeof passwordForm) => ({
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
  
  // Get error message for a field
  const getError = (field: string): string | undefined => {
    return getFieldError(formErrors, field);
  };

  // Custom Dialog component wrapper to fix TypeScript issues with Dialog props
  const DialogWrapper: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }> = ({ open, onOpenChange, children }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => {
    return <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>;
  };

  return (
    <DialogWrapper open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue={activeTab} 
          value={activeTab} 
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="profile" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Section */}
          <TabsContent value="profile" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and public profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-4">
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
                      
                      <div className="flex-1 space-y-4">
                        <div className="space-y-1">
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
                              <SelectItem value="Europe/London">London (GMT)</SelectItem>
                              <SelectItem value="Europe/Paris">Central Europe (CET)</SelectItem>
                              <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                              <SelectItem value="Asia/Shanghai">China (CST)</SelectItem>
                              <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label>Theme</Label>
                          <Select 
                            value={formData.theme || 'system'} 
                            onValueChange={handleSelectChange('theme')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-end">
                  <Button onClick={() => saveChanges('profile')} disabled={saving}>
                    {saving ? (
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
              </>
            )}
          </TabsContent>

          {/* Security Section */}
          <TabsContent value="security" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security and authentication methods.
                    </CardDescription>
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
                          <h4 className="font-medium mb-2">Recovery Codes</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Save these backup codes in a secure place to use if you lose access to your authentication device.
                          </p>
                          <div className="grid grid-cols-2 gap-2 my-2">
                            <div className="bg-muted p-2 rounded text-sm font-mono">ABCD-1234-EFGH</div>
                            <div className="bg-muted p-2 rounded text-sm font-mono">IJKL-5678-MNOP</div>
                            <div className="bg-muted p-2 rounded text-sm font-mono">QRST-9012-UVWX</div>
                            <div className="bg-muted p-2 rounded text-sm font-mono">YZ12-3456-7890</div>
                          </div>
                          <Button variant="outline" size="sm" className="mt-2">
                            Download Codes
                          </Button>
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Last Login</div>
                      <div className="last-login-info text-sm text-muted-foreground">
                        <div>Last login: {formData.last_login ? new Date(formData.last_login).toLocaleString() : 'Unknown'}</div>
                        <div>IP Address: {formData.last_ip_address || 'Unknown'}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Select 
                        value={String(formData.security_settings?.session_timeout || 30)} 
                        onValueChange={(value: string) => {
                          const newFormData = { ...formData };
                          if (newFormData.security_settings) {
                            newFormData.security_settings.session_timeout = Number(value);
                            setFormData(newFormData);
                          }
                        }}
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
                    
                    <Button variant="outline" className="w-full">
                      Log Out All Other Sessions
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your password</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword.current ? "text" : "password"} 
                          id="currentPassword" 
                          value={passwordForm.currentPassword} 
                          onChange={handlePasswordFormChange('currentPassword')} 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword((prev: typeof showPassword) => ({ ...prev, current: !prev.current }))}
                          type="button"
                        >
                          {showPassword.current ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {getError('currentPassword') && (
                        <p className="text-sm text-red-500">{getError('currentPassword')}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword.new ? "text" : "password"}
                          id="newPassword" 
                          value={passwordForm.newPassword} 
                          onChange={handlePasswordFormChange('newPassword')} 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword((prev: typeof showPassword) => ({ ...prev, new: !prev.new }))}
                          type="button"
                        >
                          {showPassword.new ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {getError('newPassword') && (
                        <p className="text-sm text-red-500">{getError('newPassword')}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword.confirm ? "text" : "password"}
                          id="confirmPassword" 
                          value={passwordForm.confirmPassword} 
                          onChange={handlePasswordFormChange('confirmPassword')} 
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword((prev: typeof showPassword) => ({ ...prev, confirm: !prev.confirm }))}
                          type="button"
                        >
                          {showPassword.confirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {getError('confirmPassword') && (
                        <p className="text-sm text-red-500">{getError('confirmPassword')}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => handlePasswordUpdate()}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Preferences Section */}
          <TabsContent value="preferences" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Display Settings</CardTitle>
                    <CardDescription>Customize how Trading Farm looks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Theme</div>
                        <div className="text-sm text-muted-foreground">
                          Choose your preferred theme
                        </div>
                      </div>
                      <Select 
                        value={formData.theme || 'system'} 
                        onValueChange={handleSelectChange('theme')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center">
                              <Sun className="h-4 w-4 mr-2" />
                              Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center">
                              <Moon className="h-4 w-4 mr-2" />
                              Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Compact View</div>
                        <div className="text-sm text-muted-foreground">
                          Show more data with less spacing
                        </div>
                      </div>
                      <Switch 
                        checked={formData.trading_preferences?.compact_view || false}
                        onCheckedChange={() => handleToggleChange('trading_preferences', 'compact_view')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Show P&L in Header</div>
                        <div className="text-sm text-muted-foreground">
                          Display your profit/loss in the navigation header
                        </div>
                      </div>
                      <Switch 
                        checked={formData.trading_preferences?.show_pnl_in_header || false}
                        onCheckedChange={() => handleToggleChange('trading_preferences', 'show_pnl_in_header')}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Trading Preferences</CardTitle>
                    <CardDescription>Configure your default trading settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultExchange">Default Exchange</Label>
                      <Select 
                        value={formData.default_exchange || ''} 
                        onValueChange={handleSelectChange('default_exchange')}
                      >
                        <SelectTrigger id="defaultExchange">
                          <SelectValue placeholder="Select exchange" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="binance">Binance</SelectItem>
                          <SelectItem value="bybit">Bybit</SelectItem>
                          <SelectItem value="coinbase">Coinbase</SelectItem>
                          <SelectItem value="kraken">Kraken</SelectItem>
                          <SelectItem value="kucoin">KuCoin</SelectItem>
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
                          value={formData.default_leverage || 1}
                          onChange={(e) => handleNumberChange('default_leverage')(e.target.value)}
                          className="w-24"
                        />
                        <span>x</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Confirm Trades</div>
                        <div className="text-sm text-muted-foreground">
                          Show confirmation dialog before executing trades
                        </div>
                      </div>
                      <Switch 
                        checked={formData.trading_preferences?.confirm_trades || false}
                        onCheckedChange={() => handleToggleChange('trading_preferences', 'confirm_trades')}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Manage your notification settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Email Notifications</div>
                        <div className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </div>
                      </div>
                      <Switch 
                        checked={formData.notifications_settings?.email || false}
                        onCheckedChange={() => handleToggleChange('notifications_settings', 'email')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Push Notifications</div>
                        <div className="text-sm text-muted-foreground">
                          Receive browser push notifications
                        </div>
                      </div>
                      <Switch 
                        checked={formData.notifications_settings?.push || false}
                        onCheckedChange={() => handleToggleChange('notifications_settings', 'push')}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Trading Alerts</div>
                        <div className="text-sm text-muted-foreground">
                          Order executions, positions, stop losses, etc.
                        </div>
                      </div>
                      <Switch 
                        checked={formData.notifications_settings?.trading_alerts || false}
                        onCheckedChange={() => handleToggleChange('notifications_settings', 'trading_alerts')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Market Updates</div>
                        <div className="text-sm text-muted-foreground">
                          Price alerts, volatility warnings, etc.
                        </div>
                      </div>
                      <Switch 
                        checked={formData.notifications_settings?.market_updates || false}
                        onCheckedChange={() => handleToggleChange('notifications_settings', 'market_updates')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Security Alerts</div>
                        <div className="text-sm text-muted-foreground">
                          Login attempts, password changes, etc.
                        </div>
                      </div>
                      <Switch 
                        checked={formData.notifications_settings?.security_alerts || false}
                        onCheckedChange={() => handleToggleChange('notifications_settings', 'security_alerts')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium">Newsletter & Updates</div>
                        <div className="text-sm text-muted-foreground">
                          Product announcements, new features, etc.
                        </div>
                      </div>
                      <Switch 
                        checked={formData.notifications_settings?.newsletter_updates || false}
                        onCheckedChange={() => handleToggleChange('notifications_settings', 'newsletter_updates')}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-end">
                  <Button onClick={() => saveChanges('preferences')} disabled={saving}>
                    {saving ? (
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
              </>
            )}
          </TabsContent>

          {/* Billing Section */}
          <TabsContent value="billing" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Manage your subscription plan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border">
                      <div>
                        <h3 className="font-bold text-lg">{formData.billing?.plan || 'Free'} Plan</h3>
                        <p className="text-sm text-muted-foreground">
                          Billed {formData.billing?.billing_cycle === 'monthly' ? 'monthly' : 'annually'}
                        </p>
                        <p className="text-sm mt-2">
                          Next billing: {formData.billing?.next_billing_date ? 
                            new Date(formData.billing.next_billing_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <Button variant="outline">Change Plan</Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Payment Method</div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                          <span>{formData.billing?.payment_method || 'No payment method on file'}</span>
                        </div>
                        <Button variant="ghost" size="sm">Update</Button>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button variant="outline" className="w-full">
                        View Billing History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Cancel Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Canceling your subscription will immediately downgrade your account to the free plan. You will lose access to premium features at the end of your current billing period.
                    </p>
                    <Button variant="destructive" className="w-full">
                      Cancel Subscription
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </DialogWrapper>
  );
}
