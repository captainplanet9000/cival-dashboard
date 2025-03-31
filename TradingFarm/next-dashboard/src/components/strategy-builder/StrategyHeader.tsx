import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SaveIcon, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StrategyHeaderProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

const StrategyHeader: React.FC<StrategyHeaderProps> = ({
  name,
  setName,
  description,
  setDescription,
  onSave,
  isSaving
}) => {
  const router = useRouter();

  return (
    <Card className="rounded-none border-t-0 border-x-0 mb-4">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/strategies')}
            title="Back to Strategies"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Strategy Builder</h2>
        </div>
        <Button 
          onClick={onSave} 
          disabled={isSaving}
          className="ml-auto"
        >
          <SaveIcon className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="strategy-name" className="block text-sm font-medium mb-1">
            Strategy Name
          </label>
          <Input
            id="strategy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter strategy name"
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="strategy-description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <Textarea
            id="strategy-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter strategy description"
            className="w-full resize-none"
            rows={1}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyHeader;
