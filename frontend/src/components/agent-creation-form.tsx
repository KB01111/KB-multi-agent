"use client";

import React, { useState } from "react";

import { PlusCircle, X, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type AgentTool = {
  id?: string;
  name: string;
  description: string;
  type: "function" | "agent" | "knowledge" | "web";
};

export type AgentConfig = {
  id?: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
  framework: "langgraph" | "openai_agents" | "hybrid";
  tools: AgentTool[];
  isTeamMember: boolean;
  // Backend configuration
  memoryBackend?: "memorysaver" | "mem0";
  knowledgeBackend?: "graphiti" | "none";
  // LangGraph options
  enableReactAgent?: boolean;
  enableCheckpointing?: boolean;
  // OpenAI Agents SDK features
  enableTracing?: boolean;
  enableVoice?: boolean;
  enableParallel?: boolean;
  enableLiteLLM?: boolean;
};

type AgentCreationFormProps = {
  onSave: (agent: AgentConfig) => void;
  onCancel: () => void;
  initialAgent?: AgentConfig;
  availableTools?: AgentTool[];
  availableAgents?: AgentConfig[];
};

const DEFAULT_AGENT: AgentConfig = {
  id: "",
  name: "",
  description: "",
  instructions: "You are a helpful assistant.",
  model: "gpt-4o",
  framework: "langgraph",
  tools: [],
  isTeamMember: false,
  // Backend configuration
  memoryBackend: "memorysaver",
  knowledgeBackend: "none",
  // LangGraph options
  enableReactAgent: false,
  enableCheckpointing: false,
  // OpenAI Agents SDK features
  enableTracing: false,
  enableVoice: false,
  enableParallel: false,
  enableLiteLLM: true,
};

export const AgentCreationForm: React.FC<AgentCreationFormProps> = ({
  onSave,
  onCancel,
  initialAgent,
  availableTools = [],
  availableAgents = [],
}) => {
  const [agent, setAgent] = useState<AgentConfig>(
    initialAgent || { ...DEFAULT_AGENT, id: `agent-${Date.now()}` }
  );
  const [selectedToolId, setSelectedToolId] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setAgent((prev) => ({ ...prev, [name]: checked }));
  };

  const addTool = () => {
    if (!selectedToolId) return;

    const tool = availableTools.find((t) => t.id === selectedToolId);
    if (!tool) return;

    if (agent.tools.some((t) => t.id === tool.id)) return;

    setAgent((prev) => ({
      ...prev,
      tools: [...prev.tools, tool],
    }));
    setSelectedToolId("");
  };

  const addAgentAsTool = () => {
    if (!selectedAgentId) return;

    const agentTool = availableAgents.find((a) => a.id === selectedAgentId);
    if (!agentTool) return;

    if (agent.tools.some((t) => t.id === agentTool.id)) return;

    const tool: AgentTool = {
      id: agentTool.id || `agent-tool-${Date.now()}`,
      name: agentTool.name,
      description: agentTool.description,
      type: "agent",
    };

    setAgent((prev) => ({
      ...prev,
      tools: [...prev.tools, tool],
    }));
    setSelectedAgentId("");
  };

  const removeTool = (toolId: string) => {
    setAgent((prev) => ({
      ...prev,
      tools: prev.tools.filter((t) => t.id !== toolId),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(agent);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            {initialAgent ? "Edit Agent" : "Create New Agent"}
          </CardTitle>
          <CardDescription>
            Configure your AI agent&apos;s capabilities and behavior
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                name="name"
                value={agent.name}
                onChange={handleChange}
                placeholder="e.g., Research Assistant"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">Agent ID</Label>
              <Input
                id="id"
                name="id"
                value={agent.id}
                onChange={handleChange}
                placeholder="e.g., research-agent"
                required
                disabled={!!initialAgent}
              />
              {!initialAgent && (
                <p className="text-xs text-muted-foreground">
                  A unique identifier for your agent
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={agent.description}
              onChange={handleChange}
              placeholder="e.g., An agent that helps with research tasks"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              name="instructions"
              value={agent.instructions}
              onChange={handleChange}
              placeholder="Detailed instructions for the agent&apos;s behavior"
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Detailed instructions that define how the agent should behave and
              respond
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={agent.model}
                onValueChange={(value) => handleSelectChange("model", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="framework">Framework</Label>
              <Select
                value={agent.framework}
                onValueChange={(value) =>
                  handleSelectChange(
                    "framework",
                    value as "langgraph" | "openai_agents" | "hybrid"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="langgraph">LangGraph</SelectItem>
                  <SelectItem value="openai_agents">OpenAI Agents</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border rounded-md p-4">
            <h3 className="font-medium">Backend Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memoryBackend">Memory Backend</Label>
                <Select
                  value={agent.memoryBackend || "memorysaver"}
                  onValueChange={(value) =>
                    handleSelectChange("memoryBackend", value as "memorysaver" | "mem0")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select memory backend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="memorysaver">MemorySaver</SelectItem>
                    <SelectItem value="mem0">Mem0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="knowledgeBackend">Knowledge Backend</Label>
                <Select
                  value={agent.knowledgeBackend || "none"}
                  onValueChange={(value) =>
                    handleSelectChange("knowledgeBackend", value as "graphiti" | "none")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select knowledge backend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="graphiti">Graphiti</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="tools">Tools</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedToolId}
                  onValueChange={setSelectedToolId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a tool" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTools.map((tool) => (
                      <SelectItem key={tool.id || ''} value={tool.id || ''}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTool}
                  disabled={!selectedToolId}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Tool
                </Button>
              </div>
            </div>

            {agent.tools.length > 0 ? (
              <div className="border rounded-md p-3 space-y-2">
                {agent.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between bg-muted/50 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          tool.type === "function"
                            ? "bg-blue-100"
                            : tool.type === "agent"
                            ? "bg-green-100"
                            : tool.type === "knowledge"
                            ? "bg-purple-100"
                            : "bg-orange-100"
                        }
                      >
                        {tool.type}
                      </Badge>
                      <span className="font-medium">{tool.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTool(tool.id || '')}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed rounded-md p-4 text-center text-muted-foreground">
                No tools added yet
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="agent-tools">Agent Tools</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedAgentId}
                  onValueChange={setSelectedAgentId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents
                      .filter((a) => a.id !== agent.id || a.id === undefined)
                      .map((agent) => (
                        <SelectItem key={agent.id || ''} value={agent.id || ''}>
                          {agent.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAgentAsTool}
                  disabled={!selectedAgentId}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Agent
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isTeamMember"
              checked={agent.isTeamMember}
              onCheckedChange={(checked) =>
                handleSwitchChange("isTeamMember", checked)
              }
            />
            <Label htmlFor="isTeamMember">Add to Agent Team</Label>
          </div>

          {agent.framework === "langgraph" && (
            <div className="space-y-4 border rounded-md p-4">
              <h3 className="font-medium">LangGraph Features</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableReactAgent"
                    checked={agent.enableReactAgent}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("enableReactAgent", checked)
                    }
                  />
                  <Label htmlFor="enableReactAgent">Enable ReAct Agent</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableCheckpointing"
                    checked={agent.enableCheckpointing}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("enableCheckpointing", checked)
                    }
                  />
                  <Label htmlFor="enableCheckpointing">Enable Checkpointing</Label>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                These features are only available when using the LangGraph framework.
                ReAct agents use a reasoning and acting approach, while checkpointing allows saving and resuming agent state.
              </p>
            </div>
          )}

          {agent.framework === "openai_agents" && (
            <div className="space-y-4 border rounded-md p-4">
              <h3 className="font-medium">OpenAI Agents SDK Features</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableTracing"
                      checked={agent.enableTracing}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableTracing", checked)
                      }
                    />
                    <Label htmlFor="enableTracing">Enable Tracing</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Visualize agent execution and debug workflows
                  </p>
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableVoice"
                      checked={agent.enableVoice}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableVoice", checked)
                      }
                    />
                    <Label htmlFor="enableVoice">Enable Voice</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Support for audio input and output
                  </p>
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableParallel"
                      checked={agent.enableParallel}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableParallel", checked)
                      }
                    />
                    <Label htmlFor="enableParallel">Enable Parallel Execution</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Run multiple tasks simultaneously for better performance
                  </p>
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableLiteLLM"
                      checked={agent.enableLiteLLM}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableLiteLLM", checked)
                      }
                    />
                    <Label htmlFor="enableLiteLLM">Enable LiteLLM</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">
                    Use multiple LLM providers through a unified interface
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">OpenAI Agents SDK Benefits</h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc pl-4">
                  <li><strong>Agent-to-Agent:</strong> Built-in support for agent-to-agent communication</li>
                  <li><strong>Tracing:</strong> Powerful tracing and debugging capabilities</li>
                  <li><strong>Voice:</strong> Adds text-to-speech and speech-to-text capabilities</li>
                  <li><strong>Parallel:</strong> Allows parallel execution of tool calls for improved performance</li>
                  <li><strong>Multi-Provider:</strong> Compatible with various LLM providers through LiteLLM</li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                These advanced features are only available when using the OpenAI Agents framework.
                Enabling them will enhance your agent&apos;s capabilities but may require additional configuration.
              </p>
            </div>
          )}

          {agent.framework === "hybrid" && (
            <div className="space-y-4 border rounded-md p-4">
              <h3 className="font-medium">Hybrid Mode Features</h3>

              <div className="grid grid-cols-1 gap-4">
                <p className="text-sm">
                  Hybrid mode combines both LangGraph and OpenAI Agents frameworks,
                  using OpenAI Agents as the primary framework and falling back to LangGraph when needed.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableTracing"
                      checked={agent.enableTracing}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableTracing", checked)
                      }
                    />
                    <Label htmlFor="enableTracing">Enable Tracing</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableVoice"
                      checked={agent.enableVoice}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableVoice", checked)
                      }
                    />
                    <Label htmlFor="enableVoice">Enable Voice</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableParallel"
                      checked={agent.enableParallel}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableParallel", checked)
                      }
                    />
                    <Label htmlFor="enableParallel">Enable Parallel Execution</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableLiteLLM"
                      checked={agent.enableLiteLLM}
                      onCheckedChange={(checked) =>
                        handleSwitchChange("enableLiteLLM", checked)
                      }
                    />
                    <Label htmlFor="enableLiteLLM">Enable LiteLLM</Label>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-md">
                <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Hybrid Mode Benefits</h4>
                <ul className="text-xs text-purple-700 dark:text-purple-400 space-y-1 list-disc pl-4">
                  <li><strong>Fallback Capability:</strong> Uses LangGraph when OpenAI Agents encounters issues</li>
                  <li><strong>Best of Both:</strong> Combines the advanced features of OpenAI Agents with LangGraph&apos;s reliability</li>
                  <li><strong>Seamless Integration:</strong> Automatically handles conversion between frameworks</li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                In hybrid mode, you can enable OpenAI Agents features while maintaining LangGraph compatibility.
                This is the recommended mode for most use cases.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-1" />
            {initialAgent ? "Update Agent" : "Create Agent"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
