"use client"

import { useState } from 'react'
import { 
  Settings, 
  ChevronRight, 
  User, 
  Bell, 
  Lock, 
  Wallet, 
  Globe, 
  BarChart2, 
  MonitorSmartphone, 
  Moon, 
  Sun, 
  Power, 
  Save,
  RefreshCw
} from 'lucide-react'

interface SettingsSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

const SettingsSection = ({ title, icon, children }: SettingsSectionProps) => (
  <div className="dashboard-card">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-lg font-medium">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
)

interface SettingsToggleProps {
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}

const SettingsToggle = ({ title, description, enabled, onChange }: SettingsToggleProps) => (
  <div className="flex items-start justify-between py-2">
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted transition-colors duration-200 ease-in-out focus:outline-none" 
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
    >
      <span
        aria-hidden="true"
        className={`${
          enabled ? 'translate-x-5 bg-primary' : 'translate-x-0 bg-white'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out`}
      />
    </div>
  </div>
)

interface SettingsSelectProps {
  title: string
  description: string
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
}

const SettingsSelect = ({ title, description, options, value, onChange }: SettingsSelectProps) => (
  <div className="flex flex-col space-y-2 py-2">
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="form-select w-full md:w-64"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

interface SettingsTextInputProps {
  title: string
  description: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

const SettingsTextInput = ({ title, description, placeholder, value, onChange }: SettingsTextInputProps) => (
  <div className="flex flex-col space-y-2 py-2">
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="form-input w-full md:w-64"
    />
  </div>
)

export default function SettingsPage() {
  // User preferences
  const [theme, setTheme] = useState('system')
  const [autoSave, setAutoSave] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [defaultTimeframe, setDefaultTimeframe] = useState('1h')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState('30')
  const [riskWarnings, setRiskWarnings] = useState(true)
  const [confirmTrades, setConfirmTrades] = useState(true)
  const [language, setLanguage] = useState('en')
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      {/* Settings Navigation */}
      <div className="flex flex-wrap gap-2">
        <button className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium">
          General
        </button>
        <button className="text-foreground hover:bg-muted px-3 py-2 rounded-md text-sm font-medium">
          Appearance
        </button>
        <button className="text-foreground hover:bg-muted px-3 py-2 rounded-md text-sm font-medium">
          Trading
        </button>
        <button className="text-foreground hover:bg-muted px-3 py-2 rounded-md text-sm font-medium">
          Notifications
        </button>
        <button className="text-foreground hover:bg-muted px-3 py-2 rounded-md text-sm font-medium">
          Security
        </button>
        <button className="text-foreground hover:bg-muted px-3 py-2 rounded-md text-sm font-medium">
          API
        </button>
      </div>
      
      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <SettingsSection title="Appearance" icon={<MonitorSmartphone className="h-5 w-5 text-primary" />}>
          <div className="flex flex-col space-y-2 py-2">
            <div className="space-y-1">
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Select your preferred theme</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <Settings className="h-4 w-4" />
                System
              </button>
            </div>
          </div>
          
          <SettingsToggle
            title="Expanded Sidebar"
            description="Keep the sidebar expanded by default"
            enabled={sidebarExpanded}
            onChange={setSidebarExpanded}
          />
          
          <SettingsSelect
            title="Language"
            description="Choose your preferred language"
            options={[
              { label: 'English', value: 'en' },
              { label: 'Spanish', value: 'es' },
              { label: 'French', value: 'fr' },
              { label: 'German', value: 'de' },
              { label: 'Japanese', value: 'ja' }
            ]}
            value={language}
            onChange={setLanguage}
          />
        </SettingsSection>
        
        {/* Trading Settings */}
        <SettingsSection title="Trading Preferences" icon={<BarChart2 className="h-5 w-5 text-primary" />}>
          <SettingsSelect
            title="Default Trading Currency"
            description="Set your preferred trading currency"
            options={[
              { label: 'USD', value: 'USD' },
              { label: 'EUR', value: 'EUR' },
              { label: 'GBP', value: 'GBP' },
              { label: 'JPY', value: 'JPY' },
              { label: 'BTC', value: 'BTC' }
            ]}
            value={defaultCurrency}
            onChange={setDefaultCurrency}
          />
          
          <SettingsSelect
            title="Default Timeframe"
            description="Set your preferred chart timeframe"
            options={[
              { label: '1 Minute', value: '1m' },
              { label: '5 Minutes', value: '5m' },
              { label: '15 Minutes', value: '15m' },
              { label: '1 Hour', value: '1h' },
              { label: '4 Hours', value: '4h' },
              { label: '1 Day', value: '1d' },
              { label: '1 Week', value: '1w' }
            ]}
            value={defaultTimeframe}
            onChange={setDefaultTimeframe}
          />
          
          <SettingsToggle
            title="Risk Warnings"
            description="Show warnings for high-risk trading actions"
            enabled={riskWarnings}
            onChange={setRiskWarnings}
          />
          
          <SettingsToggle
            title="Confirm Trades"
            description="Require confirmation before executing trades"
            enabled={confirmTrades}
            onChange={setConfirmTrades}
          />
        </SettingsSection>
        
        {/* Data Settings */}
        <SettingsSection title="Data & Synchronization" icon={<RefreshCw className="h-5 w-5 text-primary" />}>
          <SettingsToggle
            title="Auto-Refresh"
            description="Automatically refresh data at regular intervals"
            enabled={autoRefresh}
            onChange={setAutoRefresh}
          />
          
          <SettingsSelect
            title="Refresh Interval"
            description="Set how often data should be refreshed"
            options={[
              { label: '10 seconds', value: '10' },
              { label: '30 seconds', value: '30' },
              { label: '1 minute', value: '60' },
              { label: '5 minutes', value: '300' },
              { label: '15 minutes', value: '900' }
            ]}
            value={refreshInterval}
            onChange={setRefreshInterval}
          />
          
          <SettingsToggle
            title="Auto-Save"
            description="Automatically save changes to strategies and settings"
            enabled={autoSave}
            onChange={setAutoSave}
          />
        </SettingsSection>
        
        {/* Notifications Settings */}
        <SettingsSection title="Notifications" icon={<Bell className="h-5 w-5 text-primary" />}>
          <SettingsToggle
            title="Enable Notifications"
            description="Receive notifications for important events"
            enabled={notifications}
            onChange={setNotifications}
          />
          
          <div className="py-2">
            <p className="font-medium mb-2">Notification Types</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="trade-notifications" className="h-4 w-4" checked />
                <label htmlFor="trade-notifications" className="text-sm">Trade Executions</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="price-alerts" className="h-4 w-4" checked />
                <label htmlFor="price-alerts" className="text-sm">Price Alerts</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="strategy-notifications" className="h-4 w-4" checked />
                <label htmlFor="strategy-notifications" className="text-sm">Strategy Updates</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="system-notifications" className="h-4 w-4" checked />
                <label htmlFor="system-notifications" className="text-sm">System Notifications</label>
              </div>
            </div>
          </div>
        </SettingsSection>
        
        {/* API Settings */}
        <SettingsSection title="API Configuration" icon={<Globe className="h-5 w-5 text-primary" />}>
          <SettingsTextInput
            title="API Key"
            description="Your personal API key for external integrations"
            placeholder="Enter API key"
            value={apiKey}
            onChange={setApiKey}
          />
          
          <div className="pt-4">
            <button className="btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save API Settings
            </button>
          </div>
          
          <div className="py-2 mt-2">
            <p className="text-sm text-muted-foreground">
              Your API key provides access to your trading data. Keep it secure and never share it with others.
            </p>
          </div>
        </SettingsSection>
        
        {/* Account Settings */}
        <SettingsSection title="Account" icon={<User className="h-5 w-5 text-primary" />}>
          <div className="flex items-center gap-4 py-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-medium text-primary">JD</span>
            </div>
            <div>
              <p className="font-medium">John Doe</p>
              <p className="text-sm text-muted-foreground">john.doe@example.com</p>
              <button className="text-sm text-primary mt-1">Change avatar</button>
            </div>
          </div>
          
          <div className="py-2">
            <button className="btn-ghost flex items-center gap-2 text-danger">
              <Power className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
