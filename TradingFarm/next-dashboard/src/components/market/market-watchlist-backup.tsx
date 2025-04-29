// @ts-nocheck
'use client';

import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Tables } from '@/types/database.types';
import { PlusCircle, Star, Trash2, Edit2, AlertCircle, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

type MarketWatchlistItem = Tables<'market_watchlist'>;

interface MarketWatchlistProps {
  userId: string;
  className?: string;
  onSymbolSelect?: (symbol: string, exchange: string, price: number | null) => void;
}

export function MarketWatchlist({ userId, className, onSymbolSelect }: MarketWatchlistProps): React.ReactElement {
  const [watchlistItems, setWatchlistItems] = React.useState<MarketWatchlistItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MarketWatchlistItem | null>(null);

  // Form values
  const [formValues, setFormValues] = React.useState({
    symbol: '',
    exchange: '',
    notes: '',
    isFavorite: false
  });

  const { toast } = useToast();
  
  React.useEffect(() => {
    loadWatchlist();
  }, [userId]);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase
        .from('market_watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      setWatchlistItems(data || []);
    } catch (error) {
      console.error('Error loading watchlist:', error);
      toast({
        title: "Error Loading Watchlist",
        description: "Your watchlist could not be loaded. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      if (!formValues.symbol || !formValues.exchange) {
        toast({
          title: "Missing Fields",
          description: "Symbol and Exchange are required fields.",
          variant: "destructive"
        });
        return;
      }

      const supabase = createBrowserClient();
      
      const newItem = {
        user_id: userId,
        symbol: formValues.symbol.toUpperCase(),
        exchange: formValues.exchange,
        notes: formValues.notes || null,
        is_favorite: formValues.isFavorite
      };
      
      const { error } = await supabase
        .from('market_watchlist')
        .insert([newItem]);
        
      if (error) throw error;
      
      toast({
        title: "Symbol Added",
        description: `${formValues.symbol.toUpperCase()} has been added to your watchlist.`
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      loadWatchlist();
    } catch (error) {
      console.error('Error adding watchlist item:', error);
      toast({
        title: "Error Adding Symbol",
        description: "The symbol could not be added to your watchlist. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    try {
      const supabase = createBrowserClient();
      
      const updates = {
        symbol: formValues.symbol.toUpperCase(),
        exchange: formValues.exchange,
        notes: formValues.notes || null,
        is_favorite: formValues.isFavorite,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('market_watchlist')
        .update(updates)
        .eq('id', editingItem.id);
        
      if (error) throw error;
      
      toast({
        title: "Watchlist Updated",
        description: `${formValues.symbol.toUpperCase()} has been updated in your watchlist.`
      });
      
      setIsEditDialogOpen(false);
      resetForm();
      loadWatchlist();
    } catch (error) {
      console.error('Error updating watchlist item:', error);
      toast({
        title: "Error Updating Symbol",
        description: "The symbol could not be updated. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('market_watchlist')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      toast({
        title: "Symbol Removed",
        description: "The symbol has been removed from your watchlist."
      });
      
      loadWatchlist();
    } catch (error) {
      console.error('Error deleting watchlist item:', error);
      toast({
        title: "Error Removing Symbol",
        description: "The symbol could not be removed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleFavorite = async (item: MarketWatchlistItem) => {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('market_watchlist')
        .update({ 
          is_favorite: !item.is_favorite,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      loadWatchlist();
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      toast({
        title: "Action Failed",
        description: "Could not update favorite status. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const openEditDialog = (item: MarketWatchlistItem) => {
    setEditingItem(item);
    setFormValues({
      symbol: item.symbol,
      exchange: item.exchange,
      notes: item.notes || '',
      isFavorite: item.is_favorite
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormValues({
      symbol: '',
      exchange: '',
      notes: '',
      isFavorite: false
    });
    setEditingItem(null);
  };

  const getExchangeBadgeVariant = (exchange: string) => {
    const exchangeMap: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
      'binance': 'default',
      'coinbase': 'outline',
      'hyperliquid': 'secondary',
      'kraken': 'destructive'
    };
    
    return exchangeMap[exchange.toLowerCase()] || 'default';
  };

  const addWatchlistDialog = (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline" onClick={() => resetForm()}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Symbol
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            Add a new trading pair to your market watchlist.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="symbol" className="text-right">Symbol</Label>
            <Input
              id="symbol"
              placeholder="BTC/USD"
              className="col-span-3"
              value={formValues.symbol}
              onChange={(e) => setFormValues({...formValues, symbol: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exchange" className="text-right">Exchange</Label>
            <Select
              value={formValues.exchange}
              onValueChange={(value) => setFormValues({...formValues, exchange: value})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
                <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add optional notes about this trading pair"
              className="col-span-3"
              value={formValues.notes}
              onChange={(e) => setFormValues({...formValues, notes: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="favorite" className="text-right">Favorite</Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="favorite"
                checked={formValues.isFavorite}
                onCheckedChange={(checked) => setFormValues({...formValues, isFavorite: checked})}
              />
              <Label htmlFor="favorite">Mark as favorite</Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddItem}>
            Add to Watchlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const editWatchlistDialog = (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Watchlist Item</DialogTitle>
          <DialogDescription>
            Update the details for this watchlist item.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-symbol" className="text-right">Symbol</Label>
            <Input
              id="edit-symbol"
              placeholder="BTC/USD"
              className="col-span-3"
              value={formValues.symbol}
              onChange={(e) => setFormValues({...formValues, symbol: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-exchange" className="text-right">Exchange</Label>
            <Select
              value={formValues.exchange}
              onValueChange={(value) => setFormValues({...formValues, exchange: value})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="coinbase">Coinbase</SelectItem>
                <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-notes" className="text-right">Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="Add optional notes about this trading pair"
              className="col-span-3"
              value={formValues.notes}
              onChange={(e) => setFormValues({...formValues, notes: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-favorite" className="text-right">Favorite</Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="edit-favorite"
                checked={formValues.isFavorite}
                onCheckedChange={(checked) => setFormValues({...formValues, isFavorite: checked})}
              />
              <Label htmlFor="edit-favorite">Mark as favorite</Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateItem}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderWatchlistItems = () => {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg mb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ));
    }

    if (watchlistItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/30">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-1">Your watchlist is empty</p>
          <p className="text-xs max-w-[200px] mb-4">
            Add trading pairs to keep track of your favorite markets
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Symbol

        </div>
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleToggleFavorite(item)}
                >
                  <Star 
                    className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => openEditDialog(item)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    ));
  };

  const renderWatchlistItems = () => {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg mb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ));
    }

    if (watchlistItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/30">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-1">Your watchlist is empty</p>
          <p className="text-xs max-w-[200px] mb-4">
            Add trading pairs to keep track of your favorite markets
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Symbol
          </Button>
        </div>
      );
    }

    return watchlistItems.map((item: MarketWatchlistItem) => (
      <div 
        key={item.id} 
        className="flex items-center justify-between p-3 border rounded-lg mb-2 hover:border-accent-foreground/20 transition-colors cursor-pointer"
        onClick={() => onSymbolSelect && onSymbolSelect(item.symbol, item.exchange, item.last_price)}
      >
        <div>
          <div className="font-medium flex items-center">
            {item.symbol}
            {item.is_favorite && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 ml-1" />
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center">
            <Badge variant={getExchangeBadgeVariant(item.exchange)} className="mr-2">
              {item.exchange}
            </Badge>
            {item.last_update && (
              <span className="text-xs">
                Updated: {new Date(item.last_update).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(item);
                  }}
                >
                  <Star 
                    className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(item);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    ));
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Market Watchlist</span>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </Button>
        </CardTitle>
        <CardDescription>
          Track your favorite trading pairs
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ScrollArea className="h-[350px] pr-4">
          {renderWatchlistItems()}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4">
        {addWatchlistDialog}
        {editWatchlistDialog}
      </CardFooter>
    </Card>
  );
}
