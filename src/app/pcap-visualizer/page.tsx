"use client";

import type { Metadata } from 'next';
import React, { useState } from 'react';
import { AppHeader } from '@/components/dashboard/app-header';
import { ForceGraph } from '@/components/pcap/force-graph';
import { TreeMapChart } from '@/components/pcap/treemap-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, UploadCloud, Share2, ListTree, AlertTriangleIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Define types for the data expected from the API
interface PcapOutputData {
  // Define structure based on output.json
  [sourceIpOrHostname: string]: {
    [protocol: string]: {
      [port: string]: {
        [destinationIpOrHostname: string]: {
          download: number;
          upload: number;
          firstseen: number; // timestamp
          lastseen: number; // timestamp
        };
      };
    };
  };
}

interface DnsMappingData {
  [ipAddress: string]: string; // hostname
}


// export const metadata: Metadata = { // Cannot be used in client component
//   title: 'PCAP Visualizer - LogLens',
//   description: 'Upload and visualize PCAP network traffic data.',
// };


export default function PcapVisualizerPage() {
  const [outputJson, setOutputJson] = useState<PcapOutputData | null>(null);
  const [dnsMapping, setDnsMapping] = useState<DnsMappingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pythonStderr, setPythonStderr] = useState<string | null>(null);
  const [pythonStdout, setPythonStdout] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'force' | 'treemap'>('force');
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pcap')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .pcap file.",
        variant: "destructive",
      });
      return;
    }
    
    // Max file size (e.g., 50MB) - adjust as needed
    const MAX_FILE_SIZE_MB = 50;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
            title: "File Too Large",
            description: `Please upload a .pcap file smaller than ${MAX_FILE_SIZE_MB}MB. Larger files may cause performance issues.`,
            variant: "destructive",
        });
        return;
    }


    setFileName(file.name);
    const formData = new FormData();
    formData.append('pcapFile', file);

    setIsLoading(true);
    setError(null);
    setPythonStderr(null);
    setPythonStdout(null);
    setOutputJson(null);
    setDnsMapping(null);

    try {
      const response = await fetch('/api/pcap', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to process PCAP file.');
        if(result.details) setPythonStderr(result.details);
        if(result.stdout) setPythonStdout(result.stdout);
        if(result.data?.outputJson) setOutputJson(result.data.outputJson);
        if(result.data?.dnsMapping) setDnsMapping(result.data.dnsMapping);
        toast({
          title: "Processing Error",
          description: result.error || "Unknown error during PCAP processing.",
          variant: "destructive",
        });
      } else {
        setOutputJson(result.outputJson);
        setDnsMapping(result.dnsMapping);
        toast({
          title: "Processing Successful",
          description: `${file.name} processed. Visualizations are now available.`,
        });
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      toast({
        title: "Upload Error",
        description: err.message || "Could not upload or process the file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Reset file input to allow re-uploading the same file if needed
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <UploadCloud className="mr-3 h-7 w-7 text-primary" />
              PCAP File Visualizer
            </CardTitle>
            <CardDescription>
              Upload a <code>.pcap</code> file to analyze and visualize network traffic.
              The Python-based analysis may take a moment for larger files.
              Ensure Python 3 and Scapy are installed on the server. Max file size: 50MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <Input
                type="file"
                accept=".pcap"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="max-w-xs"
              />
              {isLoading && (
                <Button disabled variant="outline">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </Button>
              )}
            </div>
            {fileName && !isLoading && (
              <p className="mt-2 text-sm text-muted-foreground">
                Last upload attempt: <strong>{fileName}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error Processing PCAP</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              {pythonStdout && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Python Script Output (stdout)</summary>
                  <pre className="mt-1 p-2 bg-muted rounded-md text-xs max-h-40 overflow-auto">{pythonStdout}</pre>
                </details>
              )}
              {pythonStderr && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">Python Script Error Output (stderr)</summary>
                  <pre className="mt-1 p-2 bg-destructive/20 text-destructive-foreground rounded-md text-xs max-h-40 overflow-auto">{pythonStderr}</pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(outputJson || (error && (outputJson || dnsMapping))) && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Visualization</CardTitle>
              <div className="flex items-center justify-between">
                <CardDescription>
                  {error && (outputJson || dnsMapping) ? "Partial data available. " : ""}
                  Select a view mode to explore the network traffic data.
                </CardDescription>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'force' ? 'default' : 'outline'}
                    onClick={() => setViewMode('force')}
                    disabled={!outputJson}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Force Graph
                  </Button>
                  <Button
                    variant={viewMode === 'treemap' ? 'default' : 'outline'}
                    onClick={() => setViewMode('treemap')}
                    disabled={!outputJson}
                  >
                    <ListTree className="mr-2 h-4 w-4" />
                    Treemap
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[500px] border-t pt-6">
              {!outputJson && !isLoading && !error && (
                 <p className="text-center text-muted-foreground">No data to visualize. Please upload a PCAP file.</p>
              )}
              {outputJson && viewMode === 'force' && (
                <ForceGraph outputJson={outputJson} dnsMapping={dnsMapping || {}} />
              )}
              {outputJson && viewMode === 'treemap' && (
                <TreeMapChart outputJson={outputJson} dnsMapping={dnsMapping || {}} />
              )}
            </CardContent>
          </Card>
        )}


      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        LogLens &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
