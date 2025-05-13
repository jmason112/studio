"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
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

interface TreeMapChartProps {
  outputJson: PcapOutputData;
  dnsMapping: DnsMappingData; // May not be directly used in this treemap, but good to have
}

interface TreemapNode {
  name: string;
  children?: TreemapNode[];
  value?: number; // Represents data volume for leaf nodes
}

export function TreeMapChart({ outputJson }: TreeMapChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!outputJson || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    const width = svgRef.current.parentElement?.clientWidth || 800;
    const height = 600; // Fixed height

    svg.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

    // Transform data for treemap
    const rootData: TreemapNode = { name: "trafficRoot", children: [] };

    Object.entries(outputJson).forEach(([source, protocols]) => {
      const sourceNode: TreemapNode = { name: source, children: [] };
      Object.entries(protocols).forEach(([protocol, ports]) => {
        const protocolNode: TreemapNode = { name: protocol, children: [] };
        Object.entries(ports).forEach(([port, destinations]) => {
          const portNode: TreemapNode = { name: `Port ${port}`, children: [] };
          Object.entries(destinations).forEach(([destination, details]) => {
            const volume = details.upload + details.download;
            if (volume > 0) {
              portNode.children?.push({
                name: destination,
                value: volume,
              });
            }
          });
          if (portNode.children && portNode.children.length > 0) {
            protocolNode.children?.push(portNode);
          }
        });
        if (protocolNode.children && protocolNode.children.length > 0) {
          sourceNode.children?.push(protocolNode);
        }
      });
      if (sourceNode.children && sourceNode.children.length > 0) {
        rootData.children?.push(sourceNode);
      }
    });
    
    if (!rootData.children || rootData.children.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("No data to display in Treemap.");
      return;
    }


    const root = d3.hierarchy(rootData)
      .sum(d => d.value || 0) // Sum values for parent nodes
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreemapNode>()
      .size([width, height])
      .padding(2)
      .round(true)
      (root);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const cell = svg.selectAll("g")
      .data(root.leaves()) // Display leaf nodes
      .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
        .attr("id", d => (d.leafUid = d3.create("svg:rect").attr("id", "leaf").node()!.id))
        .attr("fill", d => {
            let ancestor = d;
            while (ancestor.depth > 1) ancestor = ancestor.parent!; // Color by top-level child of root (source)
            return colorScale(ancestor.data.name);
        })
        .attr("fill-opacity", 0.7)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    cell.append("clipPath")
        .attr("id", d => (d.clipUid = d3.create("svg:clipPath").attr("id", "clip").node()!.id))
      .append("use")
        .attr("xlink:href", d => `#${d.leafUid}`);
    
    const FONT_SIZE_THRESHOLD_WIDTH = 50; // Minimum width of a cell to show text
    const FONT_SIZE_THRESHOLD_HEIGHT = 20; // Minimum height of a cell to show text

    cell.append("text")
        .attr("clip-path", d => `url(#${d.clipUid})`)
      .selectAll("tspan")
      .data(d => {
          const nameParts = d.data.name.split(/(?=[A-Z][a-z])|\s+/g); // Split by camelCase or space
          const volumeText = `(${(d.value || 0).toLocaleString()} B)`;
          return [nameParts.join(' '), volumeText]; // Display name and volume
      })
      .join("tspan")
        .attr("x", 4)
        .attr("y", (d, i) => 14 + i * 12) // Position lines of text
        .attr("fill", "#fff")
        .attr("font-size", "10px")
        .text(d => d as string)
        .style("display", function(this: SVGTextElement, d, i,กลุ่ม) {
            const parentData = d3.select((this.parentNode as SVGGElement)).datum() as d3.HierarchyRectangularNode<TreemapNode>;
            const cellWidth = parentData.x1 - parentData.x0;
            const cellHeight = parentData.y1 - parentData.y0;
            return (cellWidth > FONT_SIZE_THRESHOLD_WIDTH && cellHeight > FONT_SIZE_THRESHOLD_HEIGHT) ? "inline" : "none";
        });

    cell.append("title")
      .text(d => `${d.ancestors().reverse().map(node => node.data.name).join(" → ")}\nVolume: ${(d.value || 0).toLocaleString()} bytes`);


  }, [outputJson]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Traffic Treemap</CardTitle>
      </CardHeader>
      <CardContent>
        <svg ref={svgRef} className="w-full h-[600px] border rounded-md bg-muted/20"></svg>
        <p className="text-xs text-muted-foreground mt-2">
          Treemap visualizes hierarchical data. Rectangles represent hosts/connections, sized by data volume. Colors indicate source IPs/hostnames. Hover for details.
        </p>
      </CardContent>
    </Card>
  );
}
