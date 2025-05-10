"use client";

import type React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Filters, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const severities: Severity[] = ["INFO", "WARNING", "ERROR", "CRITICAL", "DEBUG", "UNKNOWN"];
// Example sources, in a real app this might be dynamic
const exampleSources = ["AuthService", "PaymentGateway", "WebServer", "DatabaseService", "APIServer", "Firewall"];


const filterSchema = z.object({
  searchTerm: z.string().optional(),
  sources: z.array(z.string()).optional(),
  severities: z.array(z.string()).optional(), // z.nativeEnum(Severity) if Severity is an enum
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

type FilterFormValues = z.infer<typeof filterSchema>;

interface LogFiltersProps {
  onFilterChange: (filters: Filters) => void;
  onClearIngestedLogs: () => void;
  disabled?: boolean;
  availableSources: string[];
}

export function LogFilters({ onFilterChange, onClearIngestedLogs, disabled, availableSources }: LogFiltersProps) {
  const { register, handleSubmit, control, reset, watch, setValue } = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      searchTerm: "",
      sources: [],
      severities: [],
      dateFrom: undefined,
      dateTo: undefined,
    },
  });

  const onSubmit = (data: FilterFormValues) => {
    onFilterChange({
      searchTerm: data.searchTerm || "",
      sources: data.sources || [],
      severities: (data.severities as Severity[]) || [],
      dateRange: { from: data.dateFrom, to: data.dateTo },
    });
  };

  const handleReset = () => {
    reset();
    onFilterChange({
      searchTerm: "",
      sources: [],
      severities: [],
      dateRange: { from: undefined, to: undefined },
    });
  };

  // Dynamic rendering for checkboxes
  const currentSelectedSeverities = watch("severities") || [];
  const currentSelectedSources = watch("sources") || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6 bg-card shadow-md rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <Label htmlFor="searchTerm">Search Logs</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="searchTerm"
              placeholder="Search by message content..."
              {...register("searchTerm")}
              className="pl-9"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Controller
              name="dateFrom"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={disabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>From date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={disabled}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <Controller
              name="dateTo"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={disabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>To date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={disabled}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <Label>Severity</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start" disabled={disabled}>
                {currentSelectedSeverities.length > 0 ? `${currentSelectedSeverities.length} selected` : "Select severities"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {severities.map((severity) => (
                  <div key={severity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`severity-${severity}`}
                      checked={currentSelectedSeverities.includes(severity)}
                      onCheckedChange={(checked) => {
                        const current = currentSelectedSeverities;
                        if (checked) {
                          setValue("severities", [...current, severity]);
                        } else {
                          setValue("severities", current.filter(s => s !== severity));
                        }
                      }}
                      disabled={disabled}
                    />
                    <Label htmlFor={`severity-${severity}`} className="font-normal">{severity}</Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label>Source</Label>
           <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start" disabled={disabled || availableSources.length === 0}>
                {currentSelectedSources.length > 0 ? `${currentSelectedSources.length} selected` : "Select sources"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto">
              {availableSources.length > 0 ? (
                <div className="space-y-2">
                  {availableSources.map((source) => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={`source-${source}`}
                        checked={currentSelectedSources.includes(source)}
                        onCheckedChange={(checked) => {
                          const current = currentSelectedSources;
                          if (checked) {
                            setValue("sources", [...current, source]);
                          } else {
                            setValue("sources", current.filter(s => s !== source));
                          }
                        }}
                        disabled={disabled}
                      />
                      <Label htmlFor={`source-${source}`} className="font-normal">{source}</Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-2">No sources available</p>
              )}
            </PopoverContent>
          </Popover>
        </div>


      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
        <div className="flex gap-2">
          <Button type="submit" disabled={disabled}>
            <Search className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} disabled={disabled}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
          </Button>
        </div>
        <Button 
            type="button" 
            variant="destructive" 
            onClick={onClearIngestedLogs}
            title="This will clear logs from the current browser session for this demo. Server-side logs (if any real persistence) are not affected by this button in a real app."
            disabled={disabled}
        >
            Clear Ingested Logs (Demo)
        </Button>
      </div>
    </form>
  );
}
