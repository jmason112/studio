"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PcapOutputData {
  [sourceIpOrHostname: string]: {
    [protocol: string]: {
      [port: string]: {
        [destinationIpOrHostname: string]: {
          download: number;
          upload: number;
          firstseen: number;
          lastseen: number;
        };
      };
    };
  };
}

interface DnsMappingData {
  [ipAddress: string]: string;
}

interface ForceGraphProps {
  outputJson: PcapOutputData;
  dnsMapping: DnsMappingData;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number; // for coloring or categorization
  isHost?: boolean; // To differentiate host nodes from connection summary nodes
  connectionCount?: number;
  dataVolume?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number; // for link thickness, representing data volume
}

const PROTOCOL_COLORS: { [key: string]: string } = {
  TCP: "#1f77b4", // blue
  UDP: "#ff7f0e", // orange
  ICMP: "#2ca02c", // green
  HTTP: "#d62728", // red
  HTTPS: "#9467bd", // purple
  DNS: "#8c564b", // brown
  unknown: "#7f7f7f", // gray
};


export function ForceGraph({ outputJson, dnsMapping }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [filterPort, setFilterPort] = useState('');
  const [filterHost, setFilterHost] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const linkElementsRef = useRef<d3.Selection<SVGLineElement, Link, SVGGElement, unknown> | null>(null);
  const nodeElementsRef = useRef<d3.Selection<SVGCircleElement, Node, SVGGElement, unknown> | null>(null);
  const textElementsRef = useRef<d3.Selection<SVGTextElement, Node, SVGGElement, unknown> | null>(null);


  const processData = useCallback((data: PcapOutputData, portFilter: string, hostFilter: string) => {
    const newNodes: Node[] = [];
    const newLinks: Link[] = [];
    const nodeSet = new Set<string>();
    let totalUpDown = 0;

    Object.entries(data).forEach(([source, protocols]) => {
      Object.entries(protocols).forEach(([protocol, ports]) => {
        Object.entries(ports).forEach(([port, destinations]) => {
          if (portFilter && port !== portFilter) return;

          Object.entries(destinations).forEach(([destination, details]) => {
            totalUpDown += details.upload + details.download;
            
            const hostFilterLower = hostFilter.toLowerCase();
            if (hostFilter && 
                !source.toLowerCase().includes(hostFilterLower) && 
                !destination.toLowerCase().includes(hostFilterLower)) {
              return;
            }

            if (!nodeSet.has(source)) {
              newNodes.push({ id: source, group: 1, isHost: true, connectionCount: 0, dataVolume: 0 });
              nodeSet.add(source);
            }
            if (!nodeSet.has(destination)) {
              newNodes.push({ id: destination, group: 1, isHost: true, connectionCount: 0, dataVolume: 0 });
              nodeSet.add(destination);
            }
            
            const sourceNode = newNodes.find(n => n.id === source);
            const destNode = newNodes.find(n => n.id === destination);
            const connectionVolume = details.upload + details.download;

            if(sourceNode) {
              sourceNode.connectionCount = (sourceNode.connectionCount || 0) + 1;
              sourceNode.dataVolume = (sourceNode.dataVolume || 0) + connectionVolume;
            }
            if(destNode) {
              destNode.connectionCount = (destNode.connectionCount || 0) + 1;
              destNode.dataVolume = (destNode.dataVolume || 0) + connectionVolume;
            }

            newLinks.push({
              source: source,
              target: destination,
              value: Math.max(1, Math.log10(connectionVolume + 1)), // Log scale for value
            });
          });
        });
      });
    });
    return { nodes: newNodes, links: newLinks, totalUpDown };
  }, []);


  useEffect(() => {
    const { nodes: initialNodes, links: initialLinks } = processData(outputJson, filterPort, filterHost);
    setNodes(initialNodes);
    setLinks(initialLinks);
  }, [outputJson, filterPort, filterHost, processData]);


  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous graph

    const width = svgRef.current.parentElement?.clientWidth || 800;
    const height = 600; // Fixed height for now
    svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
    svg.call(zoom);


    simulationRef.current = d3.forceSimulation<Node, Link>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(150).strength(0.1))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.dataVolume || 1000) / 10 + 15));


    linkElementsRef.current = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));
      
    nodeElementsRef.current = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => Math.max(5, Math.sqrt(d.dataVolume || 1000) / 20 + 5)) // Size based on dataVolume
      .attr("fill", d => d.isHost ? PROTOCOL_COLORS.TCP : PROTOCOL_COLORS.unknown) // Simplified color
      .call(drag(simulationRef.current) as any);

    textElementsRef.current = g.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.id)
      .attr("font-size", "10px")
      .attr("fill", "black")
      .attr("dx", 12)
      .attr("dy", ".35em");
      
    nodeElementsRef.current.append("title").text(d => `${d.id}\nConnections: ${d.connectionCount}\nVolume: ${d.dataVolume?.toLocaleString()} bytes`);

    simulationRef.current.on("tick", () => {
      linkElementsRef.current
        ?.attr("x1", d => (d.source as Node).x!)
        ?.attr("y1", d => (d.source as Node).y!)
        ?.attr("x2", d => (d.target as Node).x!)
        ?.attr("y2", d => (d.target as Node).y!);

      nodeElementsRef.current
        ?.attr("cx", d => d.x!)
        ?.attr("cy", d => d.y!);
      
      textElementsRef.current
        ?.attr("x", d => d.x!)
        ?.attr("y", d => d.y!);
    });
    
    // Initial zoom to fit all nodes (simplified)
    if (nodes.length > 0) {
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.5); // Adjust scale as needed
        // svg.call(zoom.transform, initialTransform); // This might cause issues if called too early or repeatedly
    }


    return () => {
      simulationRef.current?.stop();
    };

  }, [nodes, links]); // Rerun when nodes/links derived from filters change

  const drag = (simulation: d3.Simulation<Node, Link>) => {
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag<SVGCircleElement, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  const handleUpdateGraph = () => {
    // This will trigger the useEffect for processing data due to state change
    // setNodes/setLinks will be called by processData effect
    // The component will re-evaluate processData with new filterPort and filterHost
    const { nodes: newNodes, links: newLinks } = processData(outputJson, filterPort, filterHost);
    setNodes(newNodes);
    setLinks(newLinks);

    if (simulationRef.current) {
        simulationRef.current.nodes(newNodes);
        simulationRef.current.force<d3.ForceLink<Node, Link>>("link")?.links(newLinks);
        simulationRef.current.alpha(1).restart(); // Reheat the simulation
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Force Graph</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-2 p-1 rounded-md">
          <div className='flex-grow'>
            <Label htmlFor="filterPort" className="text-sm">Filter by Port:</Label>
            <Input
              id="filterPort"
              type="text"
              value={filterPort}
              onChange={(e) => setFilterPort(e.target.value)}
              placeholder="e.g., 80 or 443"
              className="h-8 text-sm"
            />
          </div>
          <div className='flex-grow'>
            <Label htmlFor="filterHost" className="text-sm">Filter by Host/IP (contains):</Label>
            <Input
              id="filterHost"
              type="text"
              value={filterHost}
              onChange={(e) => setFilterHost(e.target.value)}
              placeholder="e.g., example.com or 192.168.1.1"
              className="h-8 text-sm"
            />
          </div>
          <Button onClick={handleUpdateGraph} size="sm" className="self-end">Update Graph</Button>
        </div>
      </CardHeader>
      <CardContent>
        <svg ref={svgRef} className="w-full h-[600px] border rounded-md bg-muted/20"></svg>
        <p className="text-xs text-muted-foreground mt-2">
          Nodes represent hosts/IPs. Links represent connections. Node size and link thickness may indicate data volume (log scaled). Drag nodes to rearrange. Zoom and pan supported.
        </p>
      </CardContent>
    </Card>
  );
}
