"use client"

import { useState, useEffect } from 'react'
import { 
  Bot, 
  Plus, 
  AlertCircle, 
  Trash2,
  Loader2,
  Terminal,
  Brain,
  Activity,
  Settings,
  Cpu,
  LineChart,
  BarChart2,
  PieChart,
  Zap,
  Users,
  MessageSquare,
  RefreshCw,
  DollarSign,
  HelpCircle,
  Sparkles,
  ServerCrash,
  Target,
  Layers,
  Key,
  Lock,
  Shield,
  Webhook
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Exchange } from '@/services/exchange-connector'

// Global declarations for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Farm selection and specialization types
type FarmOption = {
  id: string;
  name: string;
  status: string;
};

type SpecializationOption = {
  value: string;
  label: string;
  description: string;
};

// Available specializations for agents
const specializationOptions: SpecializationOption[] = [
  { 
    value: "Trend Following", 
    label: "Trend Following", 
    description: "Follows established market trends, focusing on momentum"
  },
  { 
    value: "Mean Reversion", 
    label: "Mean Reversion", 
    description: "Identifies and trades on price reversals back to the mean"
  },
  { 
    value: "Breakout", 
    label: "Breakout", 
    description: "Identifies and trades on significant price breakouts from ranges"
  },
  { 
    value: "Momentum", 
    label: "Momentum", 
    description: "Focuses on assets with strong directional momentum"
  },
  { 
    value: "Swing Trading", 
    label: "Swing Trading", 
    description: "Captures medium-term price movements over days/weeks"
  },
  { 
    value: "Scalping", 
    label: "Scalping", 
    description: "Fast trading with small profit targets over short timeframes"
  },
  { 
    value: "Arbitrage", 
    label: "Arbitrage", 
    description: "Exploits price differences between markets or assets"
  },
  { 
    value: "Market Making", 
    label: "Market Making", 
    description: "Provides liquidity by constantly offering to buy and sell"
  },
  { 
    value: "Statistical Arbitrage", 
    label: "Statistical Arbitrage", 
    description: "Uses mathematical models to find price inefficiencies"
  },
  { 
    value: "Sentiment Analysis", 
    label: "Sentiment Analysis", 
    description: "Trades based on market sentiment indicators"
  },
  { 
    value: "Support/Resistance", 
    label: "Support/Resistance", 
    description: "Trades based on key support and resistance levels"
  },
  { 
    value: "Pattern Recognition", 
    label: "Pattern Recognition", 
    description: "Identifies and trades on chart patterns"
  },
  { 
    value: "Volume Analysis", 
    label: "Volume Analysis", 
    description: "Trades based on volume indicators and patterns"
  },
  { 
    value: "Grid Trading", 
    label: "Grid Trading", 
    description: "Places buy and sell orders at regular intervals"
  },
  { 
    value: "Dollar Cost Averaging", 
    label: "Dollar Cost Averaging", 
    description: "Invests fixed amounts at regular intervals"
  }
];

// Available indicators for agents
const indicatorOptions = [
  "RSI",
  "Moving Averages",
  "MACD",
  "Bollinger Bands",
  "Stochastic",
  "Volume",
  "On-Balance Volume",
  "Ichimoku Cloud",
  "Fibonacci Retracement",
  "ATR",
  "CCI",
  "DMI/ADX"
];

// Available timeframes for agents
const timeframeOptions = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "Daily",
  "Weekly",
  "Monthly"
];

// Default settings for new agents
const defaultSettings = {
  risk_level: "medium",
  max_drawdown: 10,
  position_sizing: 5,
  trades_per_day: 5,
  automation_level: "semi",
  timeframes: ["1h", "4h", "Daily"],
  indicators: ["RSI", "Moving Averages", "Volume"],
  strategyType: "trend_following",
  position_size_percent: 10,
  max_open_positions: 5
};

interface CreateAgentFormProps {
  onSuccess?: (agentId: string) => void;
  onCancel?: () => void;
  initialData?: any;
  isEdit?: boolean;
}

export default function CreateAgentForm({ 
  onSuccess, 
  onCancel, 
  initialData = null,
  isEdit = false
}: CreateAgentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    name: initialData?.name || "",
    status: initialData?.status || "active",
    type: initialData?.type || "trend",
    farm_id: initialData?.farm_id || "",
    description: initialData?.description || "",
    level: initialData?.level || "intermediate",
    specialization: initialData?.specialization || [],
    wallet_address: initialData?.wallet_address || "",
    settings: initialData?.settings || defaultSettings,
    instructions: initialData?.instructions || [""],
    exchange: initialData?.exchange || {
      name: "",
      apiKey: "",
      apiSecret: "",
      apiPassphrase: "",
      apiEndpoint: ""
    }
  });
  
  // Selected/visible settings states
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(
    initialData?.specialization || []
  );
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(
    initialData?.settings?.timeframes || defaultSettings.timeframes
  );
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(
    initialData?.settings?.indicators || defaultSettings.indicators
  );
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [showSpecializationInfo, setShowSpecializationInfo] = useState(false);
  const [currentSpecializationInfo, setCurrentSpecializationInfo] = useState<SpecializationOption | null>(null);
  
  // Wallet connection state
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Load farms on mount
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await fetch('/api/database/farms');
        if (response.ok) {
          const farmsData = await response.json();
          setFarms(farmsData);
          
          // Set default farm if there are farms and no farm is selected
          if (farmsData.length > 0 && !formData.farm_id) {
            setFormData(prev => ({
              ...prev,
              farm_id: farmsData[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
        toast({
          title: "Error",
          description: "Failed to load farms. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    fetchFarms();
  }, []);
  
  // Form change handlers
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };
  
  const handleSpecializationToggle = (value: string) => {
    setSelectedSpecializations(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };
  
  const handleTimeframeToggle = (value: string) => {
    setSelectedTimeframes(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };
  
  const handleIndicatorToggle = (value: string) => {
    setSelectedIndicators(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };
  
  const addInstruction = () => {
    if (currentInstruction.trim()) {
      setFormData(prev => ({
        ...prev,
        instructions: [...prev.instructions, currentInstruction]
      }));
      setCurrentInstruction("");
    }
  };
  
  const removeInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };
  
  const showSpecializationDetails = (option: SpecializationOption) => {
    setCurrentSpecializationInfo(option);
    setShowSpecializationInfo(true);
  };
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Filter out empty instructions
      const filteredInstructions = formData.instructions.filter((instruction: string) => instruction.trim() !== "");
      
      // Prepare final form data
      const submitData = {
        ...formData,
        instructions: filteredInstructions
      };
      
      // Submit form data
      if (isEdit && initialData) {
        // Update existing agent
        // await updateAgent(initialData.id, submitData);
        toast({
          title: "Agent updated",
          description: `${submitData.name} has been updated successfully.`,
        });
      } else {
        // Create new agent
        // await createAgent(submitData);
        toast({
          title: "Agent created",
          description: `${submitData.name} has been created successfully.`,
        });
      }
      
      router.push("/agents");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleMultipleSpecializations = (value: string) => {
    const updatedSpecializations: string[] = [...formData.specialization];
    
    if (updatedSpecializations.includes(value)) {
      const index = updatedSpecializations.indexOf(value);
      updatedSpecializations.splice(index, 1);
    } else {
      updatedSpecializations.push(value);
    }
    
    setFormData({
      ...formData,
      specialization: updatedSpecializations
    });
  };
  
  const handleMultipleTimeframes = (value: string) => {
    const updatedTimeframes: string[] = [...formData.settings.timeframes];
    
    if (updatedTimeframes.includes(value)) {
      const index = updatedTimeframes.indexOf(value);
      updatedTimeframes.splice(index, 1);
    } else {
      updatedTimeframes.push(value);
    }
    
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        timeframes: updatedTimeframes
      }
    });
  };
  
  const handleMultipleIndicators = (value: string) => {
    const updatedIndicators: string[] = [...formData.settings.indicators];
    
    if (updatedIndicators.includes(value)) {
      const index = updatedIndicators.indexOf(value);
      updatedIndicators.splice(index, 1);
    } else {
      updatedIndicators.push(value);
    }
    
    setFormData({
      ...formData,
      settings: {
        ...formData.settings,
        indicators: updatedIndicators
      }
    });
  };
  
  const addInstructionField = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ""]
    });
  };
  
  const removeInstructionField = (index: number) => {
    const updatedInstructions: string[] = [...formData.instructions];
    updatedInstructions.splice(index, 1);
    
    setFormData({
      ...formData,
      instructions: updatedInstructions
    });
  };
  
  const handleInstructionChange = (index: number, value: string) => {
    const updatedInstructions: string[] = [...formData.instructions];
    updatedInstructions[index] = value;
    
    setFormData({
      ...formData,
      instructions: updatedInstructions
    });
  };
  
  // Connect wallet
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to connect your wallet.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConnectingWallet(true);
    setWalletStatus('connecting');
    
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        setFormData({
          ...formData,
          wallet_address: accounts[0]
        });
        setWalletStatus('connected');
        
        toast({
          title: "Wallet connected",
          description: `Connected to ${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to connect wallet",
        description: error.message || "Please try again or use a different wallet.",
        variant: "destructive",
      });
      setWalletStatus('disconnected');
    } finally {
      setIsConnectingWallet(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            Basic Information
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="Enter a name for your agent"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm">Trading Farm</Label>
              <Select 
                value={formData.farm_id} 
                onValueChange={(value) => handleChange("farm_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a farm" />
                </SelectTrigger>
                <SelectContent>
                  {farms.length > 0 ? (
                    farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name} ({farm.status})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-farms" disabled>
                      No farms available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Agent Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trend">Trend</SelectItem>
                  <SelectItem value="reversal">Reversal</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  <SelectItem value="dca">DCA</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="scalping">Scalping</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="learning">Learning Mode</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="level">Agent Level</Label>
              <Select 
                value={formData.level} 
                onValueChange={(value) => handleChange("level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet Address (Optional)</Label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={formData.wallet_address}
                onChange={(e) => handleChange("wallet_address", e.target.value)}
              />
              {walletStatus === 'disconnected' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center mt-2"
                  onClick={connectMetaMask}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
              {walletStatus === 'connected' && (
                <span className="text-sm text-muted-foreground mt-2">
                  Connected to {formData.wallet_address.substring(0, 6)}...{formData.wallet_address.substring(formData.wallet_address.length - 4)}
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Agent Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this agent does and its trading style"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
        
        {/* Agent Specializations */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Agent Specializations
            <HelpCircle 
              className="ml-2 h-4 w-4 text-muted-foreground cursor-pointer" 
              onClick={() => setShowSpecializationInfo(true)}
            />
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {specializationOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`specialization-${option.value}`}
                  checked={selectedSpecializations.includes(option.value)}
                  onCheckedChange={() => handleSpecializationToggle(option.value)}
                />
                <Label
                  htmlFor={`specialization-${option.value}`}
                  className="text-sm cursor-pointer flex items-center"
                >
                  {option.label}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      showSpecializationDetails(option);
                    }}
                  >
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </Label>
              </div>
            ))}
          </div>
          
          <div className="pt-2">
            <Label className="mb-2 block">Selected Specializations</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSpecializations.length > 0 ? (
                selectedSpecializations.map((spec) => (
                  <Badge 
                    key={spec} 
                    variant="secondary"
                    className="flex items-center"
                  >
                    {spec}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleSpecializationToggle(spec)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No specializations selected</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Trading Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Trading Settings
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Risk Level</Label>
                <Badge variant="outline">{formData.settings.risk_level}</Badge>
              </div>
              <Select 
                value={formData.settings.risk_level} 
                onValueChange={(value) => handleSettingsChange("risk_level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Max Drawdown (%)</Label>
                <Badge variant="outline">{formData.settings.max_drawdown}%</Badge>
              </div>
              <Slider
                min={5}
                max={50}
                step={1}
                value={[formData.settings.max_drawdown]}
                onValueChange={(value) => handleSettingsChange("max_drawdown", value[0])}
                className="py-4"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Position Sizing (%)</Label>
                <Badge variant="outline">{formData.settings.position_sizing}%</Badge>
              </div>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[formData.settings.position_sizing]}
                onValueChange={(value) => handleSettingsChange("position_sizing", value[0])}
                className="py-4"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Max Trades Per Day</Label>
                <Badge variant="outline">{formData.settings.trades_per_day}</Badge>
              </div>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[formData.settings.trades_per_day]}
                onValueChange={(value) => handleSettingsChange("trades_per_day", value[0])}
                className="py-4"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Automation Level</Label>
              <Select 
                value={formData.settings.automation_level} 
                onValueChange={(value) => handleSettingsChange("automation_level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select automation level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (Approval Required)</SelectItem>
                  <SelectItem value="semi">Semi-Automatic (Partial Approval)</SelectItem>
                  <SelectItem value="full">Fully Automated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trading Timeframes</Label>
              <div className="grid grid-cols-3 gap-2">
                {timeframeOptions.map((timeframe) => (
                  <div key={timeframe} className="flex items-center space-x-2">
                    <Checkbox
                      id={`timeframe-${timeframe}`}
                      checked={selectedTimeframes.includes(timeframe)}
                      onCheckedChange={() => handleTimeframeToggle(timeframe)}
                    />
                    <Label
                      htmlFor={`timeframe-${timeframe}`}
                      className="text-sm cursor-pointer"
                    >
                      {timeframe}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Technical Indicators</Label>
              <div className="grid grid-cols-2 gap-2">
                {indicatorOptions.map((indicator) => (
                  <div key={indicator} className="flex items-center space-x-2">
                    <Checkbox
                      id={`indicator-${indicator}`}
                      checked={selectedIndicators.includes(indicator)}
                      onCheckedChange={() => handleIndicatorToggle(indicator)}
                    />
                    <Label
                      htmlFor={`indicator-${indicator}`}
                      className="text-sm cursor-pointer"
                    >
                      {indicator}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Exchange Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center">
          <Webhook className="mr-2 h-5 w-5" />
          Exchange Configuration
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Exchange Name</Label>
            <Input
              id="exchange-name"
              placeholder="Enter exchange name"
              value={formData.exchange.name}
              onChange={(e) => handleChange("exchange.name", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              id="api-key"
              placeholder="Enter API key"
              value={formData.exchange.apiKey}
              onChange={(e) => handleChange("exchange.apiKey", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>API Secret</Label>
            <Input
              id="api-secret"
              placeholder="Enter API secret"
              value={formData.exchange.apiSecret}
              onChange={(e) => handleChange("exchange.apiSecret", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>API Passphrase</Label>
            <Input
              id="api-passphrase"
              placeholder="Enter API passphrase"
              value={formData.exchange.apiPassphrase}
              onChange={(e) => handleChange("exchange.apiPassphrase", e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>API Endpoint</Label>
            <Input
              id="api-endpoint"
              placeholder="Enter API endpoint"
              value={formData.exchange.apiEndpoint}
              onChange={(e) => handleChange("exchange.apiEndpoint", e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Agent Instructions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Agent Instructions
        </h3>
        <div className="space-y-4">
          {formData.instructions.map((instruction: string, i: number) => (
            <div key={`instruction-${i}`} className="flex items-center gap-2">
              <Textarea
                placeholder={`Enter instruction #${i + 1}`}
                value={instruction}
                onChange={(e) => handleInstructionChange(i, e.target.value)}
                className="resize-none h-24"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={() => removeInstructionField(i)}
                disabled={formData.instructions.length <= 1}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={addInstructionField}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Instruction
          </Button>
        </div>
      </div>
      
      {/* Strategy Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center">
          <LineChart className="mr-2 h-5 w-5" />
          Trading Strategy
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Strategy Type</Label>
            <Select 
              value={formData.settings.strategyType}
              onValueChange={(value) => 
                handleChange('settings.strategyType', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strategy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trend_following">Trend Following</SelectItem>
                <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                <SelectItem value="breakout">Breakout</SelectItem>
                <SelectItem value="scalping">Scalping</SelectItem>
                <SelectItem value="arbitrage">Arbitrage</SelectItem>
                <SelectItem value="grid_trading">Grid Trading</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Timeframes</Label>
            <div className="flex flex-wrap gap-2">
              {timeframeOptions.map((timeframe) => (
                <Badge 
                  key={timeframe}
                  variant={formData.settings.timeframes.includes(timeframe) ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => handleMultipleTimeframes(timeframe)}
                >
                  {timeframe}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Indicators</Label>
            <div className="flex flex-wrap gap-2">
              {indicatorOptions.map((indicator) => (
                <Badge 
                  key={indicator}
                  variant={formData.settings.indicators.includes(indicator) ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => handleMultipleIndicators(indicator)}
                >
                  {indicator}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Position Size (% of Available Balance)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[formData.settings.position_size_percent]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleChange('settings.position_size_percent', value[0])}
                  className="flex-1"
                />
                <span className="w-12 text-right">{formData.settings.position_size_percent}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Max Open Positions</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[formData.settings.max_open_positions]}
                  min={1}
                  max={20}
                  step={1}
                  onValueChange={(value) => handleChange('settings.max_open_positions', value[0])}
                  className="flex-1"
                />
                <span className="w-12 text-right">{formData.settings.max_open_positions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.name || !formData.farm_id}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
      
      {/* Specialization Info Dialog */}
      <AlertDialog open={showSpecializationInfo} onOpenChange={setShowSpecializationInfo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentSpecializationInfo ? 
                currentSpecializationInfo.label : 
                'Trading Specializations'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentSpecializationInfo ? (
                currentSpecializationInfo.description
              ) : (
                "Specializations define what trading strategies and approaches your agent will use. Select multiple specializations to create a more versatile agent."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
