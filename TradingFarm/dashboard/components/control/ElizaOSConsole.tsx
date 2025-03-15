import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { 
  Brain, 
  SendHorizontal, 
  History, 
  XCircle, 
  Terminal, 
  Copy, 
  Info,
  CheckCircle2,
  Loader2,
  HelpCircle
} from "lucide-react";
import { ElizaOSCommand, CommandCategory } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ElizaOSConsoleProps {
  commands: ElizaOSCommand[];
  commandHistory: ElizaOSCommand[];
  isElizaEnabled: boolean;
  categories: CommandCategory[];
  onSubmitCommand: (command: string) => void;
  onClearConsole: () => void;
}

const ElizaOSConsole: React.FC<ElizaOSConsoleProps> = ({
  commands,
  commandHistory,
  isElizaEnabled,
  categories,
  onSubmitCommand,
  onClearConsole
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCommandHelp, setShowCommandHelp] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll to bottom when new commands are added
    if (scrollAreaRef.current) {
      const element = scrollAreaRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [commands]);

  // Handle command input changes and generate suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.trim()) {
      // Generate command suggestions based on input
      const allCommands = categories.flatMap(category => category.commands);
      const filtered = allCommands.filter(cmd => 
        cmd.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  // Handle command submission
  const handleSubmitCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (inputValue.trim()) {
      onSubmitCommand(inputValue);
      setInputValue('');
      setSuggestions([]);
    }
  };

  // Handle keyboard shortcuts for command history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      setInputValue(suggestions[0]);
      setSuggestions([]);
    }
  };

  // Apply a suggestion
  const applySuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Copy command or response to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Format command or response for display
  const formatText = (text: string) => {
    // Handle multi-line text, code formatting, URLs, etc.
    return text;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            ElizaOS AI Command Console
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8" 
                    onClick={() => setShowCommandHelp(!showCommandHelp)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Command Help</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <History className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Command History</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {commandHistory.length === 0 ? (
                  <DropdownMenuItem disabled>No commands history</DropdownMenuItem>
                ) : (
                  commandHistory.slice(-10).reverse().map((cmd) => (
                    <DropdownMenuItem 
                      key={cmd.id}
                      onClick={() => setInputValue(cmd.command)}
                    >
                      {cmd.command.length > 30 
                        ? cmd.command.substring(0, 30) + '...' 
                        : cmd.command}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8" 
                    onClick={onClearConsole}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Console</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
        <CardDescription>
          Interact with ElizaOS AI to analyze markets, optimize strategies, and manage your trading farm
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-0">
        {showCommandHelp ? (
          <div className="border rounded-md p-4 space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Available Commands</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCommandHelp(false)}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id}>
                  <h4 className="text-sm font-medium mb-2">{category.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{category.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.commands.map((command) => (
                      <div 
                        key={command}
                        className="text-xs bg-muted p-2 rounded flex items-center justify-between cursor-pointer hover:bg-muted/80"
                        onClick={() => applySuggestion(command)}
                      >
                        <code>{command}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {category.examples.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Examples:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {category.examples.map((example, idx) => (
                          <li 
                            key={idx}
                            className="cursor-pointer hover:text-foreground"
                            onClick={() => applySuggestion(example)}
                          >
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <ScrollArea ref={scrollAreaRef} className="h-[calc(100%-3rem)] pr-4">
              {commands.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Brain className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                  <h3 className="text-lg font-medium">ElizaOS AI Assistant</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    {isElizaEnabled 
                      ? "I'm ready to help you analyze markets, optimize your strategies, and manage your trading operations."
                      : "ElizaOS is currently disabled. Enable it from the System Controls to use AI assistance."}
                  </p>
                  {isElizaEnabled && (
                    <div className="mt-6 space-y-2 text-sm">
                      <p className="font-medium">Try asking:</p>
                      <div className="space-y-2">
                        {[
                          "analyze BTC/USDT market sentiment",
                          "optimize momentum strategy for ETH/USDT",
                          "show system status",
                          "forecast market direction for next 24 hours"
                        ].map((example, idx) => (
                          <div 
                            key={idx}
                            className="bg-muted/50 hover:bg-muted px-3 py-2 rounded-md cursor-pointer"
                            onClick={() => applySuggestion(example)}
                          >
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {commands.map((cmd) => (
                    <div key={cmd.id} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="min-w-6 h-6 flex items-center justify-center mt-0.5">
                          <Terminal className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{cmd.command}</code>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => copyToClipboard(cmd.command)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 pl-8">
                        {cmd.status === 'pending' ? (
                          <div className="flex items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing request...
                          </div>
                        ) : cmd.status === 'error' ? (
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md p-3 w-full">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div className="text-sm text-red-700 dark:text-red-400">
                                {cmd.response || "An error occurred processing your command"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 w-full">
                            <div className="min-w-6 h-6 flex items-center justify-center mt-0.5">
                              {cmd.isAI ? (
                                <Brain className="h-4 w-4 text-purple-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                                {formatText(cmd.response || "")}
                              </div>
                              
                              <div className="flex justify-between items-center mt-2">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(cmd.timestamp).toLocaleTimeString()}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={() => copyToClipboard(cmd.response || "")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </CardContent>
      
      <CardFooter className="pt-4">
        <form onSubmit={handleSubmitCommand} className="w-full">
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isElizaEnabled 
                ? "Enter a command or ask ElizaOS..." 
                : "ElizaOS is disabled. Enable it from System Controls."}
              className="pr-10"
              disabled={!isElizaEnabled}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              disabled={!isElizaEnabled || !inputValue.trim()}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                  onClick={() => applySuggestion(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
          
          {inputValue && !suggestions.length && (
            <div className="mt-1.5 text-xs text-muted-foreground flex items-center">
              <Info className="h-3 w-3 mr-1" />
              Press Tab for command completion
            </div>
          )}
        </form>
      </CardFooter>
    </Card>
  );
};

export default ElizaOSConsole;
