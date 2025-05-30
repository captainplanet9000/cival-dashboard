"use client"

import { useState } from 'react'
import {
  Brain,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  Info,
  AlertCircle,
  Zap,
  Check,
  X,
  Save,
  PlusCircle,
  Edit,
  Trash2,
  Terminal,
  RefreshCw,
  BarChart2
} from 'lucide-react'

interface InstructionExample {
  text: string
  category: 'risk' | 'market' | 'timing' | 'strategy'
}

interface AgentIntelligenceProps {
  agentId: string
  agentName: string
  onClose: () => void
  onSave: (instructions: AgentInstruction[]) => void
  existingInstructions?: AgentInstruction[]
}

export interface AgentInstruction {
  id: string
  content: string
  createdAt: string
  enabled: boolean
  category: 'general' | 'risk' | 'market' | 'timing' | 'strategy'
  impact: 'low' | 'medium' | 'high'
}

export default function AgentIntelligence({
  agentId,
  agentName,
  onClose,
  onSave,
  existingInstructions = []
}: AgentIntelligenceProps) {
  const [instructions, setInstructions] = useState<AgentInstruction[]>(existingInstructions)
  const [newInstruction, setNewInstruction] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showExamples, setShowExamples] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<AgentInstruction['category']>('general')
  const [selectedImpact, setSelectedImpact] = useState<AgentInstruction['impact']>('medium')
  const [activeTab, setActiveTab] = useState<'instructions' | 'analysis'>('instructions')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Instruction examples to guide users
  const instructionExamples: InstructionExample[] = [
    { text: "Only trade Bitcoin when the daily RSI is below 30", category: 'market' },
    { text: "Reduce position size to 2% during high market volatility", category: 'risk' },
    { text: "Close all trades if drawdown exceeds 5% in a single day", category: 'risk' },
    { text: "Focus on swing trades for Ethereum with 4-hour timeframe", category: 'strategy' },
    { text: "Avoid trading during major economic news events", category: 'timing' },
    { text: "Use tight stop losses (1%) for small cap altcoins", category: 'risk' },
    { text: "Increase position sizing gradually after 3 consecutive wins", category: 'strategy' },
    { text: "Only open new positions during US market hours", category: 'timing' }
  ]

  // Handle adding a new instruction
  const handleAddInstruction = () => {
    if (newInstruction.trim() === '') return

    const newInstructionItem: AgentInstruction = {
      id: `instruction-${Date.now()}`,
      content: newInstruction,
      createdAt: new Date().toISOString(),
      enabled: true,
      category: selectedCategory,
      impact: selectedImpact
    }

    setInstructions([...instructions, newInstructionItem])
    setNewInstruction('')
    
    // Simulate AI analysis response
    simulateAiResponse(newInstruction)
  }

  // Handle deleting an instruction
  const handleDeleteInstruction = (id: string) => {
    setInstructions(instructions.filter(instruction => instruction.id !== id))
  }

  // Handle toggling instruction enabled state
  const handleToggleEnabled = (id: string) => {
    setInstructions(
      instructions.map(instruction => 
        instruction.id === id 
          ? { ...instruction, enabled: !instruction.enabled } 
          : instruction
      )
    )
  }

  // Handle updating an instruction during edit
  const handleUpdateInstruction = (index: number, content: string) => {
    const updatedInstructions = [...instructions]
    updatedInstructions[index] = {
      ...updatedInstructions[index],
      content,
      category: selectedCategory,
      impact: selectedImpact
    }
    setInstructions(updatedInstructions)
    setEditingIndex(null)
  }

  // Begin editing an instruction
  const startEditing = (index: number) => {
    setNewInstruction(instructions[index].content)
    setSelectedCategory(instructions[index].category)
    setSelectedImpact(instructions[index].impact)
    setEditingIndex(index)
  }

  // Save all changes
  const handleSaveAllChanges = () => {
    onSave(instructions)
    onClose()
  }

  // Simulate AI analyzing the instruction and providing feedback
  const simulateAiResponse = (instruction: string) => {
    setIsAnalyzing(true)
    setAiResponse(null)
    
    // Simulate delay for AI processing
    setTimeout(() => {
      // Generate a contextual response based on the instruction content
      let response = ''
      
      if (instruction.toLowerCase().includes('rsi')) {
        response = `Adding RSI-based conditions will help the agent make more data-driven decisions. The agent will now monitor RSI values before opening trades. Consider also adding volume conditions for more robust signals.`
      } else if (instruction.toLowerCase().includes('stop loss') || instruction.toLowerCase().includes('risk')) {
        response = `Risk management instruction accepted. I'll enforce these risk parameters across all trading activities. This should significantly reduce drawdown risk while maintaining potential for profitability.`
      } else if (instruction.toLowerCase().includes('time') || instruction.toLowerCase().includes('hour')) {
        response = `Time-based constraint added. The agent will respect these timing parameters for trade execution. Note that this may cause the agent to miss some opportunities outside the specified timeframe.`
      } else {
        response = `Instruction accepted. I've analyzed your instruction and will adjust the agent's behavior accordingly. This instruction has been prioritized and will influence future trading decisions.`
      }
      
      setAiResponse(response)
      setIsAnalyzing(false)
    }, 1500)
  }

  // Get category badge color
  const getCategoryColor = (category?: AgentInstruction['category']) => {
    switch (category) {
      case 'risk': return 'bg-destructive/10 text-destructive'
      case 'market': return 'bg-primary/10 text-primary'
      case 'timing': return 'bg-warning/10 text-warning'
      case 'strategy': return 'bg-success/10 text-success'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Get impact badge style
  const getImpactStyle = (impact?: AgentInstruction['impact']) => {
    switch (impact) {
      case 'high': return 'bg-destructive/10 text-destructive'
      case 'medium': return 'bg-warning/10 text-warning'
      case 'low': return 'bg-success/10 text-success'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary/10 p-2 rounded-full mr-3">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Agent Intelligence</h2>
              <p className="text-sm text-muted-foreground">
                Configure {agentName} with natural language instructions
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'instructions' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('instructions')}
          >
            Instructions
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm ${activeTab === 'analysis' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('analysis')}
          >
            Impact Analysis
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'instructions' && (
            <>
              {/* Instructions information */}
              <div className="dashboard-card p-4 mb-6">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-primary mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-1">About Natural Language Instructions</h3>
                    <p className="text-sm text-muted-foreground">
                      Instructions allow you to guide your agent's behavior using plain English. 
                      The AI will analyze your instructions and adjust the agent's trading decisions accordingly.
                      Create specific, clear instructions for best results.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Current instructions list */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Current Instructions</h3>
                
                {instructions.length > 0 ? (
                  <div className="space-y-3">
                    {instructions.map((instruction, index) => (
                      <div 
                        key={instruction.id} 
                        className={`p-3 border rounded-md ${instruction.enabled ? 'border-border' : 'border-border/50 bg-muted/30'}`}
                      >
                        {editingIndex === index ? (
                          <div className="space-y-3">
                            <textarea
                              value={newInstruction}
                              onChange={(e) => setNewInstruction(e.target.value)}
                              className="form-input min-h-[80px]"
                              placeholder="Enter instruction..."
                            />
                            
                            <div className="flex flex-wrap gap-3">
                              <div>
                                <label className="block text-xs mb-1">Category</label>
                                <div className="flex flex-wrap gap-2">
                                  {(['general', 'risk', 'market', 'timing', 'strategy'] as const).map((cat) => (
                                    <button
                                      key={cat}
                                      onClick={() => setSelectedCategory(cat)}
                                      className={`px-2 py-1 rounded-md text-xs ${selectedCategory === cat ? getCategoryColor(cat) : 'bg-muted/50'}`}
                                    >
                                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-xs mb-1">Impact Level</label>
                                <div className="flex flex-wrap gap-2">
                                  {(['low', 'medium', 'high'] as const).map((impact) => (
                                    <button
                                      key={impact}
                                      onClick={() => setSelectedImpact(impact)}
                                      className={`px-2 py-1 rounded-md text-xs ${selectedImpact === impact ? getImpactStyle(impact) : 'bg-muted/50'}`}
                                    >
                                      {impact.charAt(0).toUpperCase() + impact.slice(1)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => setEditingIndex(null)} 
                                className="btn-outline-sm"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleUpdateInstruction(index, newInstruction)}
                                className="btn-primary-sm"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center flex-wrap gap-2">
                                <div className={`h-2 w-2 rounded-full ${instruction.enabled ? 'bg-success' : 'bg-muted'}`}></div>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(instruction.category)}`}>
                                  {instruction.category.charAt(0).toUpperCase() + instruction.category.slice(1)}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getImpactStyle(instruction.impact)}`}>
                                  {instruction.impact.charAt(0).toUpperCase() + instruction.impact.slice(1)} Impact
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Added {new Date(instruction.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => startEditing(index)}
                                  className="p-1 rounded-md hover:bg-muted"
                                  aria-label="Edit"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteInstruction(instruction.id)}
                                  className="p-1 rounded-md hover:bg-muted text-destructive"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleToggleEnabled(instruction.id)}
                                  className="p-1 rounded-md hover:bg-muted"
                                  aria-label={instruction.enabled ? "Disable" : "Enable"}
                                >
                                  {instruction.enabled ? (
                                    <Check className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className={`text-sm ${!instruction.enabled && 'text-muted-foreground'}`}>
                              {instruction.content}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-card p-6 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-medium mb-1">No Instructions Yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add instructions to guide your agent's behavior and decision-making process.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Examples section */}
              <div className="mb-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowExamples(!showExamples)}
                >
                  <h3 className="text-lg font-medium">Example Instructions</h3>
                  <button className="p-1 rounded-md hover:bg-muted">
                    {showExamples ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {showExamples && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {instructionExamples.map((example, index) => (
                      <div 
                        key={index} 
                        className="p-3 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/30"
                        onClick={() => {
                          setNewInstruction(example.text)
                          setSelectedCategory(example.category)
                          setEditingIndex(null)
                        }}
                      >
                        <div className="flex items-center mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(example.category)}`}>
                            {example.category.charAt(0).toUpperCase() + example.category.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm">{example.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add new instruction */}
              <div className="dashboard-card p-4">
                <h3 className="text-sm font-medium mb-3">Add New Instruction</h3>
                <div className="space-y-4">
                  <textarea
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    className="form-input min-h-[100px]"
                    placeholder="Enter a clear, specific instruction for your agent..."
                  />
                  
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-xs mb-1">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {(['general', 'risk', 'market', 'timing', 'strategy'] as const).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 rounded-md text-xs ${selectedCategory === cat ? getCategoryColor(cat) : 'bg-muted/50'}`}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs mb-1">Impact Level</label>
                      <div className="flex flex-wrap gap-2">
                        {(['low', 'medium', 'high'] as const).map((impact) => (
                          <button
                            key={impact}
                            onClick={() => setSelectedImpact(impact)}
                            className={`px-2 py-1 rounded-md text-xs ${selectedImpact === impact ? getImpactStyle(impact) : 'bg-muted/50'}`}
                          >
                            {impact.charAt(0).toUpperCase() + impact.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddInstruction}
                      disabled={!newInstruction.trim()}
                      className={`btn-primary-sm flex items-center gap-1 ${!newInstruction.trim() && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Instruction
                    </button>
                  </div>
                </div>
              </div>
              
              {/* AI feedback area */}
              {aiResponse && (
                <div className="dashboard-card p-4 mt-6 bg-primary/5 border-primary/20">
                  <div className="flex">
                    <div className="bg-primary/10 p-2 rounded-full mr-3 h-fit">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-primary mb-1">AI Analysis</h3>
                      <p className="text-sm">{aiResponse}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="dashboard-card p-4 mt-6 animate-pulse">
                  <div className="flex items-center">
                    <div className="bg-muted p-2 rounded-full mr-3">
                      <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground">Analyzing instruction impact...</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'analysis' && (
            <>
              <div className="dashboard-card p-4 mb-6">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-warning mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-1">Impact Analysis Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      This analysis shows how your instructions may affect the agent's performance.
                      Note that actual results may vary based on market conditions.
                    </p>
                  </div>
                </div>
              </div>
              
              {instructions.length > 0 ? (
                <div className="space-y-6">
                  {/* Risk impact */}
                  <div className="dashboard-card p-4">
                    <h3 className="text-sm font-medium mb-4">Risk Profile Impact</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Risk Level</p>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 text-warning mr-1" />
                            <p className="text-sm">Medium</p>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-warning" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Expected Drawdown</p>
                          <p className="text-sm">12.5%</p>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-destructive" style={{ width: '40%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm">Position Size Impact</p>
                          <p className="text-sm">Reduced by 15%</p>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '55%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Strategy impact */}
                  <div className="dashboard-card p-4">
                    <h3 className="text-sm font-medium mb-4">Strategy Impact</h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="bg-success/10 p-1 rounded mr-2 mt-0.5">
                          <Check className="h-3 w-3 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Improved Market Condition Detection</p>
                          <p className="text-xs text-muted-foreground">
                            Instructions will help refine when trades are executed based on specific conditions
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-success/10 p-1 rounded mr-2 mt-0.5">
                          <Check className="h-3 w-3 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">More Targeted Asset Selection</p>
                          <p className="text-xs text-muted-foreground">
                            Specialization in specific assets may increase focus and expertise
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-warning/10 p-1 rounded mr-2 mt-0.5">
                          <AlertCircle className="h-3 w-3 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Potential Trade Frequency Reduction</p>
                          <p className="text-xs text-muted-foreground">
                            More specific conditions may reduce overall number of trades
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Performance projection */}
                  <div className="dashboard-card p-4">
                    <h3 className="text-sm font-medium mb-4">Performance Projection</h3>
                    <div className="h-60 flex items-center justify-center bg-muted/20 rounded-md">
                      <div className="text-center">
                        <BarChart2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          Performance projection chart will be implemented in the next phase
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 border border-border rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Projected Win Rate</p>
                        <p className="text-lg font-medium text-success">58.5%</p>
                        <p className="text-xs text-muted-foreground">+2.3% from current</p>
                      </div>
                      
                      <div className="p-3 border border-border rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Projected Monthly Return</p>
                        <p className="text-lg font-medium text-success">4.2%</p>
                        <p className="text-xs text-muted-foreground">-0.8% from current</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Instruction conflicts */}
                  <div className="dashboard-card p-4">
                    <h3 className="text-sm font-medium mb-4">Instruction Conflicts</h3>
                    {instructions.length > 1 ? (
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <div className="bg-warning/10 p-1 rounded mr-2 mt-0.5">
                            <AlertCircle className="h-3 w-3 text-warning" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Minor Timing Conflicts Detected</p>
                            <p className="text-xs text-muted-foreground">
                              Some instructions may create overlapping time constraints that reduce trading opportunities
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No conflicts detected between current instructions.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="dashboard-card p-6 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium mb-1">No Instructions to Analyze</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add instructions first to see their projected impact on agent performance.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between">
          <button className="btn-outline-sm" onClick={onClose}>
            Cancel
          </button>
          
          <div className="flex gap-2">
            <button className="btn-secondary-sm flex items-center gap-1">
              <Terminal className="h-4 w-4" />
              Test Instructions
            </button>
            <button 
              className="btn-primary-sm flex items-center gap-1"
              onClick={handleSaveAllChanges}
            >
              <Save className="h-4 w-4" />
              Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
