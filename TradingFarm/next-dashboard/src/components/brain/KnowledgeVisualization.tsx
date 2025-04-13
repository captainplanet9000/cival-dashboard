"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBrowserClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, MoveHorizontal, Network, Search, ZoomIn, ZoomOut } from "lucide-react";
import * as d3 from "d3";

interface KnowledgeVisualizationProps {
  farmId?: string;
}

interface KnowledgeNode {
  id: string;
  title: string;
  category: string;
  size: number;
  group: number;
}

interface KnowledgeLink {
  source: string;
  target: string;
  value: number;
  similarity: number;
}

interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

// Color scale for different groups
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

export function KnowledgeVisualization({ farmId }: KnowledgeVisualizationProps) {
  const [activeView, setActiveView] = useState<string>("network");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  
  const supabase = createBrowserClient();
  
  // Fetch knowledge graph data
  const { data: graphData, isLoading, isError, refetch } = useQuery({
    queryKey: ["knowledgeGraph", farmId, selectedCategory],
    queryFn: async (): Promise<KnowledgeGraph> => {
      try {
        // In a real implementation, this would call a server function to build the graph
        // For demo purposes, we'll generate sample data
        
        // Mock query that would be used in a real implementation
        // const { data, error } = await supabase.rpc('get_knowledge_graph', {
        //   farm_id_param: farmId,
        //   category_filter: selectedCategory !== 'all' ? selectedCategory : null,
        //   similarity_threshold: 0.7
        // });
        
        // if (error) throw error;
        // return data;
        
        // Generate demo data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        const categories = ["strategy", "market", "risk", "technical"];
        const nodeCount = 20 + Math.floor(Math.random() * 10);
        
        const nodes: KnowledgeNode[] = Array.from({ length: nodeCount }).map((_, i) => {
          const category = categories[Math.floor(Math.random() * categories.length)];
          const group = categories.indexOf(category) + 1;
          
          return {
            id: `node-${i}`,
            title: `${category.charAt(0).toUpperCase() + category.slice(1)} Document ${i + 1}`,
            category,
            size: 10 + Math.floor(Math.random() * 20),
            group
          };
        });
        
        // Generate links between nodes with higher probability within the same group
        const links: KnowledgeLink[] = [];
        nodes.forEach((source) => {
          nodes.forEach((target) => {
            if (source.id !== target.id) {
              // Higher probability of link if in same group
              const probability = source.group === target.group ? 0.3 : 0.05;
              if (Math.random() < probability) {
                links.push({
                  source: source.id,
                  target: target.id,
                  value: 1 + Math.floor(Math.random() * 3),
                  similarity: 0.5 + Math.random() * 0.5
                });
              }
            }
          });
        });
        
        return { nodes, links };
      } catch (error) {
        console.error("Error fetching knowledge graph:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });
  
  // Set up and render the force-directed graph
  useEffect(() => {
    if (!graphData || !svgRef.current || activeView !== "network") return;
    
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear existing graph
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Create a force simulation
    const simulation = d3.forceSimulation<any, any>()
      .force("link", d3.forceLink().id((d: any) => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d.size || 10) + 2));
    
    // Create links
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));
    
    // Create nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(graphData.nodes)
      .join("circle")
      .attr("r", d => d.size / 2)
      .attr("fill", d => colorScale(d.group.toString()))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .html(`<div class="font-medium">${d.title}</div><div class="text-xs text-muted-foreground">${d.category}</div>`);
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1.5);
        tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        setSelectedNode(d);
      })
      .call(drag(simulation));
    
    // Create labels
    const label = svg.append("g")
      .selectAll("text")
      .data(graphData.nodes)
      .join("text")
      .attr("font-size", 10)
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(d => d.title)
      .style("pointer-events", "none") // Don't want labels to get in the way of node interaction
      .style("opacity", 0.7);
    
    // Update positions on each tick
    simulation.nodes(graphData.nodes).on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
    // Set up the link source/target
    simulation.force("link").links(graphData.links);
    
    // Setup zoom capabilities
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        svg.selectAll("g").attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Implement drag capability
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    // Return cleanup function
    return () => {
      simulation.stop();
    };
  }, [graphData, activeView]);
  
  // Matrix visualization
  useEffect(() => {
    if (!graphData || !svgRef.current || activeView !== "matrix") return;
    
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear existing graph
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const padding = 20;
    
    const nodes = graphData.nodes;
    const n = nodes.length;
    
    // Create an adjacency matrix
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // Fill matrix with link values
    graphData.links.forEach(link => {
      const sourceIndex = nodes.findIndex(node => node.id === link.source);
      const targetIndex = nodes.findIndex(node => node.id === link.target);
      if (sourceIndex >= 0 && targetIndex >= 0) {
        matrix[sourceIndex][targetIndex] = link.similarity;
        matrix[targetIndex][sourceIndex] = link.similarity; // For undirected graph
      }
    });
    
    const cellSize = Math.min((width - padding * 2) / n, (height - padding * 2) / n);
    
    // Create color scale for cells
    const cellColor = d3.scaleLinear<string>()
      .domain([0, 1])
      .range(["#f8fafc", "#0ea5e9"]);
    
    // Create cell groups
    const cell = svg
      .append("g")
      .attr("transform", `translate(${padding}, ${padding})`)
      .selectAll("g")
      .data(matrix)
      .join("g")
      .attr("transform", (d, i) => `translate(0, ${i * cellSize})`);
    
    // Add rectangles for each cell
    cell.selectAll("rect")
      .data((d, i) => d.map((value, j) => ({ value, i, j })))
      .join("rect")
      .attr("x", (d, i) => i * cellSize)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", d => d.i === d.j ? "#e2e8f0" : cellColor(d.value))
      .attr("stroke", "#f1f5f9")
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
        
        if (d.i !== d.j && d.value > 0) {
          tooltip
            .style("opacity", 1)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px")
            .html(`
              <div class="font-medium">Similarity: ${(d.value * 100).toFixed(0)}%</div>
              <div class="text-xs">${nodes[d.i].title}</div>
              <div class="text-xs">↔</div>
              <div class="text-xs">${nodes[d.j].title}</div>
            `);
        }
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#f1f5f9").attr("stroke-width", 1);
        tooltip.style("opacity", 0);
      });
    
    // Add row labels
    svg.append("g")
      .attr("transform", `translate(${padding - 5}, ${padding})`)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("y", (d, i) => i * cellSize + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title)
      .style("font-family", "sans-serif");
    
    // Add column labels (rotated)
    svg.append("g")
      .attr("transform", `translate(${padding}, ${padding - 5})`)
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d, i) => i * cellSize + cellSize / 2)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "middle")
      .attr("transform", (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, 0)`)
      .attr("font-size", 10)
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title)
      .style("font-family", "sans-serif");
    
  }, [graphData, activeView]);
  
  // Render categories for the legend
  const renderCategories = () => {
    if (!graphData) return null;
    
    // Get unique categories
    const categories = Array.from(new Set(graphData.nodes.map(node => node.category)));
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {categories.map((category, index) => (
          <Badge 
            key={category}
            variant="outline"
            className="flex items-center gap-1"
          >
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: colorScale((index + 1).toString()) }}
            />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
        ))}
      </div>
    );
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Knowledge Visualization</CardTitle>
            <CardDescription>
              Explore relationships between your knowledge assets
            </CardDescription>
          </div>
          <Network className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <Tabs defaultValue="network" value={activeView} onValueChange={setActiveView}>
              <TabsList className="h-9">
                <TabsTrigger value="network" className="text-xs px-3">
                  <Network className="h-3.5 w-3.5 mr-1" />
                  Network
                </TabsTrigger>
                <TabsTrigger value="matrix" className="text-xs px-3">
                  <MoveHorizontal className="h-3.5 w-3.5 mr-1" />
                  Matrix
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="market">Market Analysis</SelectItem>
                <SelectItem value="risk">Risk Management</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {graphData && renderCategories()}
      </CardHeader>
      
      <CardContent className="p-0 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="flex items-center justify-center bg-destructive/10 text-destructive rounded-full h-12 w-12 mb-2">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">Error loading knowledge graph</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <svg ref={svgRef} width="100%" height="400" className="overflow-visible" />
            <div 
              ref={tooltipRef} 
              className="absolute pointer-events-none bg-white p-2 rounded-md shadow-md text-sm border opacity-0 z-50 transition-opacity"
            />
            
            {selectedNode && (
              <div className="absolute bottom-4 right-4 p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-md w-64 border">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{selectedNode.title}</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5" 
                    onClick={() => setSelectedNode(null)}
                  >
                    ×
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Category: {selectedNode.category}</p>
                <div className="flex gap-1 mt-2">
                  <Button variant="secondary" size="sm" className="text-xs h-7">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    Find Related
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
