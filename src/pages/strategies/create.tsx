import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from '../../components/ui/use-toast';

export default function CreateStrategy() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [naturalLanguageDefinition, setNaturalLanguageDefinition] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [showCustomCode, setShowCustomCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !naturalLanguageDefinition) {
      toast({
        title: 'Error',
        description: 'Strategy name and definition are required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          naturalLanguageDefinition,
          isPublic,
          customCode: customCode || undefined,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create strategy');
      }
      
      const result = await response.json();
      
      toast({
        title: 'Strategy Created',
        description: `Strategy "${result.strategy.name}" created successfully`
      });
      
      // Reset form
      setName('');
      setDescription('');
      setNaturalLanguageDefinition('');
      setIsPublic(false);
      setTags('');
      setCustomCode('');
      setShowCustomCode(false);
      
    } catch (error) {
      console.error('Error creating strategy:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create strategy',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Strategy</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Strategy Creation</CardTitle>
          <CardDescription>
            Create a new trading strategy using natural language
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Strategy Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for your strategy"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your strategy"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="definition">Natural Language Definition</Label>
              <Textarea
                id="definition"
                value={naturalLanguageDefinition}
                onChange={(e) => setNaturalLanguageDefinition(e.target.value)}
                placeholder="Describe your strategy in plain English, e.g., 'Buy Bitcoin when RSI drops below 30, use a 2% stop loss and 6% take profit target'"
                rows={6}
                required
              />
              <p className="text-sm text-gray-500">
                Describe your trading strategy in natural language. Include entry and exit conditions, 
                risk management parameters, and any specific indicators or timeframes.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="momentum, bitcoin, scalping (comma-separated)"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="isPublic">Make this strategy public</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="showCustomCode"
                checked={showCustomCode}
                onCheckedChange={setShowCustomCode}
              />
              <Label htmlFor="showCustomCode">Add custom code</Label>
            </div>
            
            {showCustomCode && (
              <div className="space-y-2">
                <Label htmlFor="customCode">Custom Strategy Code (Optional)</Label>
                <Textarea
                  id="customCode"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="// Add your custom strategy code here"
                  rows={10}
                  className="font-mono"
                />
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Strategy'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Tips for Defining Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Be specific about indicators:</strong> Mention specific indicators like RSI, MACD, Bollinger Bands, etc.
            </li>
            <li>
              <strong>Specify timeframes:</strong> Mention if your strategy works on specific timeframes (1h, 4h, 1d, etc.)
            </li>
            <li>
              <strong>Include risk management:</strong> Define stop loss, take profit, position sizing, etc.
            </li>
            <li>
              <strong>Entry conditions:</strong> Clearly state when to enter a trade
            </li>
            <li>
              <strong>Exit conditions:</strong> Clearly state when to exit a trade
            </li>
            <li>
              <strong>Market conditions:</strong> Specify which market or coins this strategy is designed for
            </li>
          </ul>
          
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <p className="font-semibold">Example:</p>
            <p className="italic mt-2">
              "This is a momentum strategy for Bitcoin on the 1-hour timeframe. Enter long when MACD shows a bullish crossover and RSI is above 50. 
              Use a 3% stop loss and 9% take profit target. Position size should be 2% of account balance. 
              Exit the trade if price crosses below the 20-period moving average or after holding for 24 hours."
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 