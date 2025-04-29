'use client';

import React, { useState } from 'react';
import { DialogWrapper } from '@/components/ui/dialog-wrapper';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useTradingAnalytics } from '@/utils/analytics/trading-analytics';

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
}

interface ExportDataType {
  id: string;
  name: string;
  description: string;
}

interface DataExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Callback when export is successfully completed */
  onSuccess?: (exportDetails: ExportDetails) => void;
  /** Default date range to export */
  defaultDateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ExportDetails {
  format: string;
  dataTypes: string[];
  dateRange: {
    from: Date;
    to: Date;
  };
  includeCharts: boolean;
}

/**
 * Modal for exporting analytics data in various formats
 * Follows standardized modal pattern with isOpen/onClose props and success callback
 */
export function DataExportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultDateRange
}: DataExportModalProps) {
  const [format, setFormat] = useState<string>('csv');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['trades', 'performance']);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>(defaultDateRange || {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();
  const { trackEvent } = useTradingAnalytics();

  const exportFormats: ExportFormat[] = [
    { id: 'csv', name: 'CSV', extension: '.csv' },
    { id: 'xlsx', name: 'Excel', extension: '.xlsx' },
    { id: 'pdf', name: 'PDF Report', extension: '.pdf' },
    { id: 'json', name: 'JSON', extension: '.json' }
  ];

  const dataTypes: ExportDataType[] = [
    { id: 'trades', name: 'Trades', description: 'All trade history and executions' },
    { id: 'performance', name: 'Performance Metrics', description: 'P&L, win rate, and other KPIs' },
    { id: 'strategies', name: 'Strategy Performance', description: 'Performance broken down by strategy' },
    { id: 'portfolio', name: 'Portfolio History', description: 'Historical portfolio value' },
    { id: 'assets', name: 'Asset Allocation', description: 'Current asset distribution' }
  ];

  const handleDataTypeToggle = (dataTypeId: string) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(dataTypeId)) {
        return prev.filter(id => id !== dataTypeId);
      } else {
        return [...prev, dataTypeId];
      }
    });
  };

  const handleExport = async () => {
    if (selectedDataTypes.length === 0) {
      toast({
        title: "No data selected",
        description: "Please select at least one data type to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // Simulation of export process - in a real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const exportDetails: ExportDetails = {
        format,
        dataTypes: selectedDataTypes,
        dateRange,
        includeCharts
      };
      
      // Track the export event
      trackEvent({
        category: 'performance',
        action: 'create',
        label: `Export-${format}`,
        properties: {
          format,
          dataTypes: selectedDataTypes,
          dateFrom: dateRange.from.toISOString(),
          dateTo: dateRange.to.toISOString(),
          includeCharts
        }
      });
      
      toast({
        title: "Export completed",
        description: `Your data has been exported as ${format.toUpperCase()}`,
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(exportDetails);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DialogWrapper
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Analytics Data</DialogTitle>
          <DialogDescription>
            Export your trading analytics data in various formats for record keeping or further analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Export Format</h3>
            <RadioGroup value={format} onValueChange={setFormat} className="flex space-x-2">
              {exportFormats.map(exportFormat => (
                <div key={exportFormat.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={exportFormat.id} id={`format-${exportFormat.id}`} />
                  <Label htmlFor={`format-${exportFormat.id}`}>{exportFormat.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Date Range</h3>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({
                          from: range.from,
                          to: range.to
                        });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Data to Include</h3>
            <div className="grid grid-cols-1 gap-2">
              {dataTypes.map(dataType => (
                <div key={dataType.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`data-${dataType.id}`}
                    checked={selectedDataTypes.includes(dataType.id)}
                    onCheckedChange={() => handleDataTypeToggle(dataType.id)}
                  />
                  <div>
                    <Label htmlFor={`data-${dataType.id}`} className="font-medium">
                      {dataType.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{dataType.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-charts"
              checked={includeCharts}
              onCheckedChange={(checked) => setIncludeCharts(!!checked)}
            />
            <Label htmlFor="include-charts">
              Include charts and visualizations (PDF only)
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedDataTypes.length === 0}>
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogWrapper>
  );
}
