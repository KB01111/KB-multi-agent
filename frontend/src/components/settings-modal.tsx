"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { 
  AppSettings, 
  DEFAULT_SETTINGS, 
  SETTINGS_STORAGE_KEY 
} from "@/lib/settings-types";
import { 
  Key, 
  Save, 
  X, 
  Moon, 
  Sun, 
  Bug, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Get settings from local storage
  const [savedSettings, setSavedSettings] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  // Local state for form
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'api-keys' | 'features'>('api-keys');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showLangsmithKey, setShowLangsmithKey] = useState(false);
  const [showCopilotKey, setShowCopilotKey] = useState(false);
  const [showGraphitiKey, setShowGraphitiKey] = useState(false);

  // Load settings from local storage
  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
    setIsLoading(false);
  }, [savedSettings]);

  // Save settings
  const saveSettings = () => {
    setSavedSettings(settings);
    onClose();
  };

  // Update API key
  const updateApiKey = (key: keyof AppSettings['apiKeys'], value: string) => {
    setSettings({
      ...settings,
      apiKeys: {
        ...settings.apiKeys,
        [key]: value,
      },
    });
  };

  // Update feature flag
  const updateFeatureFlag = (flag: keyof AppSettings['featureFlags'], value: boolean) => {
    setSettings({
      ...settings,
      featureFlags: {
        ...settings.featureFlags,
        [flag]: value,
      },
    });
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Configure API keys and application settings
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            className={cn(
              "px-4 py-2 font-medium text-sm",
              activeTab === 'api-keys' 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab('api-keys')}
          >
            <Key className="w-4 h-4 inline-block mr-2" />
            API Keys
          </button>
          <button
            className={cn(
              "px-4 py-2 font-medium text-sm",
              activeTab === 'features' 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab('features')}
          >
            <Sun className="w-4 h-4 inline-block mr-2" />
            Features
          </button>
        </div>

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                <span>OpenAI API Key</span>
                <button 
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <Input
                type={showOpenAIKey ? "text" : "password"}
                value={settings.apiKeys.openaiApiKey}
                onChange={(e) => updateApiKey('openaiApiKey', e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">
                Required for the backend agent functionality
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                <span>Langsmith API Key</span>
                <button 
                  onClick={() => setShowLangsmithKey(!showLangsmithKey)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showLangsmithKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <Input
                type={showLangsmithKey ? "text" : "password"}
                value={settings.apiKeys.langsmithApiKey}
                onChange={(e) => updateApiKey('langsmithApiKey', e.target.value)}
                placeholder="ls-..."
              />
              <p className="text-xs text-muted-foreground">
                Optional for LangSmith tracing and monitoring
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                <span>Copilot Cloud API Key</span>
                <button 
                  onClick={() => setShowCopilotKey(!showCopilotKey)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showCopilotKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <Input
                type={showCopilotKey ? "text" : "password"}
                value={settings.apiKeys.copilotCloudApiKey}
                onChange={(e) => updateApiKey('copilotCloudApiKey', e.target.value)}
                placeholder="cpk-..."
              />
              <p className="text-xs text-muted-foreground">
                Required for the frontend chat functionality
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                <span>Graphiti API Key</span>
                <button 
                  onClick={() => setShowGraphitiKey(!showGraphitiKey)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showGraphitiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </label>
              <Input
                type={showGraphitiKey ? "text" : "password"}
                value={settings.apiKeys.graphitiApiKey}
                onChange={(e) => updateApiKey('graphitiApiKey', e.target.value)}
                placeholder="gft-..."
              />
              <p className="text-xs text-muted-foreground">
                Optional for Knowledge Graph functionality
              </p>
            </div>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="dark-mode"
                checked={settings.featureFlags.enableDarkMode}
                onCheckedChange={(checked) => 
                  updateFeatureFlag('enableDarkMode', checked === true)
                }
              />
              <label
                htmlFor="dark-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
              >
                <Moon className="w-4 h-4 mr-2" />
                Enable Dark Mode
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="debug-mode"
                checked={settings.featureFlags.enableDebugMode}
                onCheckedChange={(checked) => 
                  updateFeatureFlag('enableDebugMode', checked === true)
                }
              />
              <label
                htmlFor="debug-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
              >
                <Bug className="w-4 h-4 mr-2" />
                Enable Debug Mode
              </label>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Some features are experimental and may not work as expected.
                  Changes to these settings may require a page refresh to take effect.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
