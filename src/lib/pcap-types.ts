// This file can be used to define types specific to the PCAP visualization data.

export interface PcapConnectionDetails {
  download: number;
  upload: number;
  firstseen: number; // timestamp
  lastseen: number; // timestamp
}

export interface PcapPortData {
  [destinationIpOrHostname: string]: PcapConnectionDetails;
}

export interface PcapProtocolData {
  [port: string]: PcapPortData;
}

export interface PcapSourceData {
  [protocol: string]: PcapProtocolData;
}

export interface PcapOutputJson {
  [sourceIpOrHostname: string]: PcapSourceData;
}

export interface PcapDnsMappingJson {
  [ipAddress: string]: string; // maps IP to hostname
}

// For D3 Force Graph
export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  group: number; 
  isHost?: boolean;
  connectionCount?: number;
  dataVolume?: number;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node; // ID or D3Node object
  target: string | D3Node; // ID or D3Node object
  value: number; // for link thickness
}


// For D3 Treemap
export interface D3TreemapNode {
  name: string;
  children?: D3TreemapNode[];
  value?: number; // Represents data volume for leaf nodes
}
