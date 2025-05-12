
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { AgentConfig, Severity } from '@/lib/types';
import { Download, Info, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const severities: Severity[] = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]; // Exclude UNKNOWN for threshold

const agentConfigSchema = z.object({
  agentName: z.string().min(3, { message: "Agent name must be at least 3 characters." }).max(50),
  description: z.string().max(200).optional(),
  monitoredSources: z.array(z.string()).min(1, { message: "Select at least one source to monitor." }),
  severityThreshold: z.enum(severities),
  alertKeywords: z.string().transform(val => val.split(',').map(k => k.trim()).filter(Boolean)), // Comma-separated keywords
  notificationUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  isEnabled: z.boolean().default(true),
});

type AgentConfigFormValues = z.infer<typeof agentConfigSchema>;

export function AgentCustomizationForm() {
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');
  const { toast } = useToast();

  // Fetch available log sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      setIsLoadingSources(true);
      try {
        const response = await fetch('/api/logs');
        if (!response.ok) throw new Error('Failed to fetch logs for sources');
        const logs = await response.json();
        const sources = Array.from(new Set(logs.map((log: any) => log.source))) as string[];
        setAvailableSources(sources.sort());
      } catch (error) {
        console.error("Failed to load sources:", error);
        toast({
          title: "Error Loading Sources",
          description: "Could not fetch available log sources. You can still enter sources manually or proceed without selection.",
          variant: "destructive",
        });
        // Provide some defaults if fetch fails
        setAvailableSources(["AuthService", "WebServer", "Database", "Firewall", "PaymentGateway"]);
      } finally {
        setIsLoadingSources(false);
      }
    };
    fetchSources();
  }, [toast]);

  const form = useForm<AgentConfigFormValues>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      agentName: "",
      description: "",
      monitoredSources: [],
      severityThreshold: "WARNING",
      alertKeywords: [],
      notificationUrl: "",
      isEnabled: true,
    },
  });

  const currentSelectedSources = form.watch("monitoredSources") || [];

  const onSubmit = (data: AgentConfigFormValues) => {
    // Remap form data to AgentConfig structure if needed (schema transform handles keywords)
    const agentConfig: AgentConfig = {
      ...data,
      alertKeywords: data.alertKeywords, // Already transformed by schema
    };

    try {
      const configJson = JSON.stringify(agentConfig, null, 2);
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `${data.agentName.replace(/\s+/g, '_').toLowerCase()}_config.json`;
      
      setDownloadLink(url);
      setGeneratedFilename(filename);

      toast({
        title: "Configuration Generated",
        description: "Your agent configuration file is ready for download.",
        variant: "default",
      });

      // // Optional: Clean up object URL after some time or on unmount
      // setTimeout(() => {
      //   URL.revokeObjectURL(url);
      //   setDownloadLink(null);
      // }, 60000); // Clean up after 1 minute

    } catch (error) {
      console.error("Failed to generate config:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate the configuration file.",
        variant: "destructive",
      });
      setDownloadLink(null);
      setGeneratedFilename('');
    }
  };

  // Clean up object URL when component unmounts or link changes
  useEffect(() => {
    const currentLink = downloadLink;
    return () => {
      if (currentLink) {
        URL.revokeObjectURL(currentLink);
      }
    };
  }, [downloadLink]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="agentName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Production Web Server Monitor" {...field} />
              </FormControl>
              <FormDescription>A unique name for this agent configuration.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose of this agent..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monitoredSources"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monitored Sources</FormLabel>
               <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full justify-start" disabled={isLoadingSources}>
                      {currentSelectedSources.length > 0 ? `${currentSelectedSources.length} selected` : "Select sources"}
                      {isLoadingSources && <span className="ml-2 text-xs text-muted-foreground">(Loading...)</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {availableSources.map((source) => (
                      <FormItem key={source} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(source)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), source])
                                : field.onChange(
                                    (field.value || []).filter(
                                      (value) => value !== source
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{source}</FormLabel>
                      </FormItem>
                    ))}
                     {availableSources.length === 0 && !isLoadingSources && (
                        <p className="text-sm text-muted-foreground p-2">No sources found.</p>
                     )}
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>Select the log sources this agent should monitor.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="severityThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severity Threshold</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select minimum severity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {severities.map((severity) => (
                    <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Agent will process logs with this severity level or higher.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alertKeywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert Keywords (comma-separated)</FormLabel>
              <FormControl>
                {/* We use a hidden input and display a textarea for user input */}
                <Textarea 
                    placeholder="e.g., failed, error, critical, timeout, denied" 
                    onChange={(e) => field.onChange(e.target.value)} // Update RHF with the raw string
                    // Display the value potentially stored in RHF (which could be array if loaded)
                    value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                />
              </FormControl>
              <FormDescription>Trigger alerts if log messages contain any of these keywords.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notificationUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notification URL (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://your-webhook-endpoint.com" {...field} />
              </FormControl>
              <FormDescription>Enter a webhook URL to send alerts to (if supported by the agent).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Agent</FormLabel>
                <FormDescription>
                  Set whether this agent configuration should be active upon deployment.
                </FormDescription>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={!!downloadLink}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Generate Configuration
        </Button>

        {downloadLink && (
          <Alert className="mt-6 bg-accent/10 border-accent/30">
            <Info className="h-4 w-4 text-accent" />
            <AlertTitle className="text-accent">Configuration Ready!</AlertTitle>
            <AlertDescription className="flex flex-col md:flex-row md:items-center md:justify-between mt-2">
              <span>Your agent configuration file has been generated.</span>
              <Button asChild variant="outline" size="sm" className="mt-2 md:mt-0 md:ml-4 border-accent text-accent hover:bg-accent/20">
                <a href={downloadLink} download={generatedFilename}>
                  <Download className="mr-2 h-4 w-4" />
                  Download {generatedFilename}
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
}
