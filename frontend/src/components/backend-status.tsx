"use client";

import { useState, useEffect } from "react";

import { Server, AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiClient } from "@/lib/api-client";

type ServiceInfo = {
  available: boolean;
  status: string;
};

type BackendHealth = {
  status: string;
  message: string;
  timestamp: string;
  version: string;
  framework?: string;
  services: Record<string, ServiceInfo>;
  system?: {
    python_version: string;
    platform: string;
    processor: string;
  };
};

export function BackendStatus() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkBackendStatus = async () => {
    setIsRefreshing(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
      console.log(`Checking backend status at ${backendUrl}/health`);

      // Create an API client instance
      const apiClient = new ApiClient(backendUrl);

      // Check if the backend is available
      const isAvailable = await apiClient.isBackendAvailable();

      if (isAvailable) {
        // Get detailed health information
        const healthData = await apiClient.getHealthInfo();
        console.log('Backend health data:', healthData);

        setBackendStatus('connected');
        setBackendHealth(healthData);
      } else {
        console.error('Backend health check failed');
        setBackendStatus('disconnected');
        setBackendHealth(null);
      }
    } catch (error) {
      console.error('Backend health check error:', error);
      // Log more detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      setBackendStatus('disconnected');
      setBackendHealth(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    // Set up a periodic check every 30 seconds
    const intervalId = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const getStatusIcon = (status: boolean) => {
    if (status) {
      return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500 animate-pulse';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Backend Status
        </CardTitle>
        <Server className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(backendStatus)}`}></div>
            <div className="text-sm font-medium">
              {backendStatus === 'checking' && 'Checking...'}
              {backendStatus === 'connected' && 'Connected'}
              {backendStatus === 'disconnected' && 'Disconnected'}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={checkBackendStatus}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh status</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {backendStatus === 'connected' && backendHealth && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">{backendHealth.version}</span>
            </div>

            {backendHealth.framework && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Framework:</span>
                <span className="font-medium">{backendHealth.framework}</span>
              </div>
            )}

            <div className="pt-2 border-t">
              <h4 className="text-xs font-semibold mb-2">Services</h4>
              {Object.entries(backendHealth.services).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(info.available)}
                    <span>{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{info.status}</span>
                </div>
              ))}
            </div>

            {backendHealth.system && (
              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold mb-2">System</h4>
                <div className="text-xs text-muted-foreground">
                  <div>Python: {backendHealth.system.python_version}</div>
                  <div>Platform: {backendHealth.system.platform}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {backendStatus === 'disconnected' && (
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
            <p className="text-sm font-medium">Cannot connect to backend</p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure the backend server is running
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
