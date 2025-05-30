"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Share2,
  Search,
  Filter,
  TrendingUp,
  CreditCard,
  Download,
  ShoppingCart,
  Star,
  BarChart2,
  Cpu,
  DollarSign,
  Clock,
  Bookmark,
  Tag,
  Zap,
  ChevronRight,
  Users,
  CheckCircle,
  CircleAlert,
  Building,
  Code,
  Coins
} from "lucide-react";

export function StrategyMarketplace() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState("popularity");
  
  // Mock strategy data
  const strategies = [
    {
      id: "strat-1",
      name: "Volume Profile Breakout",
      description: "Identifies breakouts from volume profile accumulation zones with momentum confirmation",
      author: {
        name: "Jane Smith",
        avatar: "/avatars/jane.jpg",
        reputation: 4.8,
        strategies: 12
      },
      category: "momentum",
      tags: ["breakout", "volume analysis", "momentum"],
      price: 250,
      rating: 4.7,
      reviews: 38,
      installations: 146,
      performance: {
        winRate: 68.5,
        profitFactor: 1.95,
        maxDrawdown: 12.3,
        avgReturn: 1.8
      },
      compatibility: ["ElizaOS", "MetaTrader", "TradingView"],
      lastUpdated: "2025-04-01T14:30:00Z",
      verified: true,
      featured: true
    },
    {
      id: "strat-2",
      name: "Mean Reversion Suite",
      description: "Comprehensive mean reversion strategy suite with adaptive parameters for different market regimes",
      author: {
        name: "John Davis",
        avatar: "/avatars/john.jpg",
        reputation: 4.5,
        strategies: 8
      },
      category: "mean-reversion",
      tags: ["mean reversion", "overbought", "oversold", "adaptive"],
      price: 375,
      rating: 4.5,
      reviews: 24,
      installations: 98,
      performance: {
        winRate: 72.1,
        profitFactor: 1.82,
        maxDrawdown: 14.8,
        avgReturn: 1.2
      },
      compatibility: ["ElizaOS", "TradingView"],
      lastUpdated: "2025-03-15T10:15:00Z",
      verified: true,
      featured: false
    },
    {
      id: "strat-3",
      name: "Volatility Expansion Hunter",
      description: "Volatility breakout strategy targeting high-probability expansion moves with customizable risk parameters",
      author: {
        name: "Sarah Chen",
        avatar: "/avatars/sarah.jpg",
        reputation: 4.9,
        strategies: 5
      },
      category: "volatility",
      tags: ["volatility", "breakout", "expansion"],
      price: 195,
      rating: 4.6,
      reviews: 31,
      installations: 127,
      performance: {
        winRate: 64.3,
        profitFactor: 2.15,
        maxDrawdown: 16.2,
        avgReturn: 2.4
      },
      compatibility: ["ElizaOS", "MetaTrader", "NinjaTrader"],
      lastUpdated: "2025-03-28T09:45:00Z",
      verified: true,
      featured: true
    },
    {
      id: "strat-4",
      name: "Machine Learning Market Regime Classifier",
      description: "ML-powered strategy that identifies market regimes and adapts trading parameters accordingly",
      author: {
        name: "Mike Johnson",
        avatar: "/avatars/mike.jpg",
        reputation: 4.7,
        strategies: 3
      },
      category: "machine-learning",
      tags: ["machine learning", "regime detection", "adaptive"],
      price: 495,
      rating: 4.8,
      reviews: 19,
      installations: 76,
      performance: {
        winRate: 69.2,
        profitFactor: 2.05,
        maxDrawdown: 13.5,
        avgReturn: 2.1
      },
      compatibility: ["ElizaOS"],
      lastUpdated: "2025-04-05T16:30:00Z",
      verified: false,
      featured: true
    },
    {
      id: "strat-5",
      name: "Order Flow Imbalance Detector",
      description: "Identifies significant order flow imbalances and capitalizes on institutional footprints",
      author: {
        name: "Alex Wong",
        avatar: "/avatars/alex.jpg",
        reputation: 4.6,
        strategies: 7
      },
      category: "order-flow",
      tags: ["order flow", "market depth", "institutional"],
      price: 325,
      rating: 4.4,
      reviews: 22,
      installations: 83,
      performance: {
        winRate: 61.8,
        profitFactor: 1.78,
        maxDrawdown: 15.7,
        avgReturn: 1.9
      },
      compatibility: ["ElizaOS", "TradingView"],
      lastUpdated: "2025-03-20T11:20:00Z",
      verified: true,
      featured: false
    }
  ];
  
  // Mock user purchases
  const userPurchases = [
    {
      id: "purchase-1",
      strategyId: "strat-3",
      purchaseDate: "2025-04-02T14:30:00Z",
      price: 195,
      status: "active"
    }
  ];
  
  // Filter strategies
  const filteredStrategies = strategies.filter(strategy => {
    // Search query filter
    const matchesSearch = 
      strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategy.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Category filter
    const matchesCategory = selectedCategory === "all" || strategy.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Sort strategies
  const sortedStrategies = [...filteredStrategies].sort((a, b) => {
    switch (sortOrder) {
      case "popularity":
        return b.installations - a.installations;
      case "rating":
        return b.rating - a.rating;
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "newest":
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      default:
        return 0;
    }
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Get category badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "momentum":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Momentum</Badge>;
      case "mean-reversion":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Mean Reversion</Badge>;
      case "volatility":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Volatility</Badge>;
      case "machine-learning":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Machine Learning</Badge>;
      case "order-flow":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Order Flow</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };
  
  // Check if user has purchased a strategy
  const hasPurchased = (strategyId: string) => {
    return userPurchases.some(purchase => purchase.strategyId === strategyId);
  };
  
  // Render star rating
  const renderStarRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-amber-500 text-amber-500" />
        ))}
        {hasHalfStar && (
          <Star className="h-4 w-4 fill-amber-500 text-amber-500 fill-[50%]" />
        )}
        {Array.from({ length: 5 - fullStars - (hasHalfStar ? 1 : 0) }).map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };
  
  // Get selected strategy
  const getSelectedStrategy = () => {
    return strategies.find(s => s.id === selectedStrategy);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Strategy Marketplace</h2>
          <p className="text-muted-foreground">
            Discover, share, and acquire powerful trading strategies
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            <Building className="h-4 w-4 mr-2" />
            My Strategies
          </Button>
          <Button>
            <Share2 className="h-4 w-4 mr-2" />
            Publish Strategy
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Available Strategies</CardTitle>
            <CardDescription>In marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategies.length}</div>
            <div className="text-sm text-muted-foreground">
              across {new Set(strategies.map(s => s.category)).size} categories
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Purchases</CardTitle>
            <CardDescription>Licensed strategies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userPurchases.length}</div>
            <div className="text-sm text-muted-foreground">
              ${userPurchases.reduce((sum, p) => sum + p.price, 0)} total value
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Featured Strategies</CardTitle>
            <CardDescription>Top performing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategies.filter(s => s.featured).length}</div>
            <div className="text-sm text-muted-foreground">
              updated weekly
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ElizaOS Integration</CardTitle>
            <CardDescription>Compatibility</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategies.filter(s => s.compatibility.includes("ElizaOS")).length}</div>
            <div className="text-sm text-muted-foreground">
              fully compatible strategies
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Browse Strategies</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={sortOrder}
                    onValueChange={setSortOrder}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popularity">Most Popular</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search strategies..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={selectedCategory === "momentum" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("momentum")}
                  >
                    Momentum
                  </Button>
                  <Button 
                    variant={selectedCategory === "mean-reversion" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("mean-reversion")}
                  >
                    Mean Reversion
                  </Button>
                  <Button 
                    variant={selectedCategory === "volatility" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("volatility")}
                  >
                    Volatility
                  </Button>
                  <Button 
                    variant={selectedCategory === "machine-learning" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("machine-learning")}
                  >
                    ML
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {sortedStrategies.map((strategy) => (
                  <Card key={strategy.id} className={`overflow-hidden cursor-pointer hover:border-primary/50 transition-colors ${
                    strategy.id === selectedStrategy ? 'border-primary' : ''
                  }`} onClick={() => setSelectedStrategy(strategy.id)}>
                    <div className="flex items-start p-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-lg">{strategy.name}</div>
                              {strategy.verified && (
                                <Badge className="bg-primary/20 text-primary border-primary/30 ml-2">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              {strategy.featured && (
                                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {strategy.description}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-lg font-bold">${strategy.price}</div>
                            {hasPurchased(strategy.id) && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 mt-1">
                                Purchased
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {getCategoryBadge(strategy.category)}
                          {strategy.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="px-2 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={strategy.author.avatar} />
                                <AvatarFallback>{strategy.author.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="text-sm">{strategy.author.name}</div>
                            </div>
                            <div className="flex items-center">
                              {renderStarRating(strategy.rating)}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({strategy.reviews})
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <Download className="h-3 w-3 inline mr-1" />
                              {strategy.installations} installations
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Updated {formatDate(strategy.lastUpdated)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {sortedStrategies.length === 0 && (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground space-y-2">
                      <Search className="h-12 w-12 mx-auto opacity-20" />
                      <p>No strategies found matching your criteria</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-3">
          {selectedStrategy ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle>{getSelectedStrategy()?.name}</CardTitle>
                <CardDescription>
                  {getSelectedStrategy()?.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">${getSelectedStrategy()?.price}</div>
                  <div>
                    {hasPurchased(selectedStrategy) ? (
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    ) : (
                      <Button>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-medium">Performance Metrics</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1">
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                      <div className="font-medium">{getSelectedStrategy()?.performance.winRate}%</div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                      <div className="font-medium">{getSelectedStrategy()?.performance.profitFactor}</div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <div className="text-xs text-muted-foreground">Max Drawdown</div>
                      <div className="font-medium">{getSelectedStrategy()?.performance.maxDrawdown}%</div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <div className="text-xs text-muted-foreground">Avg Return/Trade</div>
                      <div className="font-medium">{getSelectedStrategy()?.performance.avgReturn}%</div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getSelectedStrategy()?.author.avatar} />
                      <AvatarFallback>{getSelectedStrategy()?.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{getSelectedStrategy()?.author.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getSelectedStrategy()?.author.strategies} strategies published
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <span className="font-medium">{getSelectedStrategy()?.author.reputation}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium">Compatibility</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {getSelectedStrategy()?.compatibility.map((platform, i) => (
                        <Badge key={i} variant="outline" className={
                          platform === "ElizaOS" ? "bg-primary/10 text-primary border-primary/30" : ""
                        }>
                          {platform === "ElizaOS" && <Zap className="h-3 w-3 mr-1" />}
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="text-sm font-medium">Reviews & Ratings</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="text-3xl font-bold">{getSelectedStrategy()?.rating.toFixed(1)}</div>
                      <div className="flex flex-col">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < Math.round(getSelectedStrategy()?.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getSelectedStrategy()?.reviews} reviews
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Read Reviews
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Additional Information</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Updated {formatDate(getSelectedStrategy()?.lastUpdated || "")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>{getSelectedStrategy()?.installations} installations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <span>ElizaOS Integration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-muted-foreground" />
                      <span>Source Code Available</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save for Later
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="h-full flex flex-col justify-center items-center p-6">
              <div className="text-center space-y-2">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                <h3 className="font-medium text-lg">Strategy Details</h3>
                <p className="text-sm text-muted-foreground">
                  Select a strategy to view detailed information, performance metrics, and purchase options.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
