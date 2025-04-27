"use client";

import React, { useState, _useEffect } from "react";

import { _Plus,
  Users,
  _Settings,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Brain,
  Workflow,
  Zap,
  Sparkl_es
 } from "lucide-react";

import type { AgentConfig, AgentTool } from "@/components/agent-creation-form";
import { AgentCr_eationForm  } from "@/components/agent-creation-form";
import { OpenAIAg_entsExport  } from "@/components/openai-agents-export";
import type { TeamConfig } from "@/components/team-creation-form";
import { TeamCr_eationForm  } from "@/components/team-creation-form";
import { Badg_e  } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitl_e,
 } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigg_er  } from "@/components/ui/dialog";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigg_er,
 } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigg_er  } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigg_er  } from "@/components/ui/tooltip";
import { us_eToast  } from "@/components/ui/use-toast";


// Sample tools for demonstration
const SAMPLE_TOOLS: AgentTool[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for information",
    type: "web",
  },
  {
    id: "knowledge-graph",
    name: "Knowledge Graph",
    description: "Query the knowledge graph",
    type: "knowledge",
  },
  {
    id: "math-tool",
    name: "Math Tool",
    description: "Perform mathematical calculations",
    type: "function",
  },
  {
    id: "weather-tool",
    name: "Weather Tool",
    description: "Get weather information",
    type: "function",
  },
];

export const AgentManager: React.FC = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [teams, setTeams] = useState<TeamConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamConfig | null>(null);
  const [activeTab, setActiveTab] = useState("agents");
  const { toast } = useToast();

  // Load agents from backend API or localStorage on component mount
  _useEffect(() => {
    const fetchAgents = async () => {
      try {
        // Import the agent API client
        const { AgentApi } = await import('@/lib/api/agent-api');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
        const agentApi = new AgentApi(backendUrl);

        try {
          // Try to fetch agents from backend API
          const agents = await agentApi.listAgents();
          // Ensure all agents have the isTeamMember property and tools array
          const agentsWithTeamMember = agents.map(agent => ({
            ...agent,
            isTeamMember: agent.isTeamMember || false,
            tools: agent.tools || []
          }));
          setAgents(agentsWithTeamMember as any);
          console.log("Loaded agents from backend API:", agents.length);
        } catch (_error) {
          console._error("Error fetching agents from API:", _error);

          // Fall back to localStorage if API fails
          const savedAgents = localStorage.getItem("custom-agents");
          if (savedAgents) {
            try {
              setAgents(JSON.parse(savedAgents));
              console.log("Loaded agents from localStorage");
            } catch (_e) {
              console._error("Error loading agents from localStorage:", _e);
            }
          }
        }
      } catch (_error) {
        console._error("Error importing agent API:", _error);

        // Fall back to localStorage
        const savedAgents = localStorage.getItem("custom-agents");
        if (savedAgents) {
          try {
            setAgents(JSON.parse(savedAgents));
            console.log("Loaded agents from localStorage (fallback)");
          } catch (_e) {
            console._error("Error loading agents from localStorage:", _e);
          }
        }
      }
    };

    const fetchTeams = async () => {
      try {
        // Import the team API client
        const { TeamApi } = await import('@/lib/api/team-api');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
        const teamApi = new TeamApi(backendUrl);

        try {
          // Try to fetch teams from backend API
          const teams = await teamApi.listTeams();
          setTeams(teams);
          console.log("Loaded teams from backend API:", teams.length);
        } catch (_error) {
          console._error("Error fetching teams from API:", _error);

          // Fall back to localStorage if API fails
          const savedTeams = localStorage.getItem("agent-teams");
          if (savedTeams) {
            try {
              setTeams(JSON.parse(savedTeams));
              console.log("Loaded teams from localStorage");
            } catch (_e) {
              console._error("Error loading teams from localStorage:", _e);
            }
          }
        }
      } catch (_error) {
        console._error("Error importing team API:", _error);

        // Fall back to localStorage
        const savedTeams = localStorage.getItem("agent-teams");
        if (savedTeams) {
          try {
            setTeams(JSON.parse(savedTeams));
            console.log("Loaded teams from localStorage (fallback)");
          } catch (_e) {
            console._error("Error loading teams from localStorage:", _e);
          }
        }
      }
    };

    fetchAgents();
    fetchTeams();
  }, []);

  // Save agents to localStorage whenever they change
  _useEffect(() => {
    localStorage.setItem("custom-agents", JSON.stringify(agents));
  }, [agents]);

  // Save teams to localStorage whenever they change
  _useEffect(() => {
    localStorage.setItem("agent-teams", JSON.stringify(teams));
  }, [teams]);

  const handleSaveAgent = async (agent: AgentConfig) => {
    try {
      // Import the agent API client
      const { AgentApi } = await import('@/lib/api/agent-api');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
      const agentApi = new AgentApi(backendUrl);

      if (editingAgent) {
        // Update existing agent
        // For now, just update locally since we don't have an update endpoint
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? agent : a))
        );
        setEditingAgent(null);

        console.log(`Agent "${agent.name}" updated successfully`);

        toast({
          title: "Success",
          description: `Agent "${agent.name}" updated successfully`,
          variant: "default"
        });
      } else {
        // Create new agent
        try {
          const response = await agentApi.createAgent(agent);

          // Update the agent ID with the one from the _response
          const createdAgent = {
            ...agent,
            id: _response.id
          };

          setAgents((prev) => [...prev, createdAgent]);

          console.log(`Agent "${agent.name}" created successfully with ID: ${_response.id}`);

          toast({
            title: "Success",
            description: `Agent "${agent.name}" created successfully`,
            variant: "default"
          });
        } catch (_error) {
          console._error('Error creating agent:', _error);

          // Fallback to local creation if API fails
          setAgents((prev) => [...prev, agent]);

          const errorMessage = _error instanceof Error ? _error.message : 'Unknown _error';
          console.log(`Agent created locally only. Backend API _error: ${errorMessage}`);

          toast({
            title: "Warning",
            description: `Agent created locally only. Backend API _error: ${errorMessage}`,
            variant: "destructive"
          });
        }
      }
    } catch (_error) {
      console._error('Error importing agent API:', _error);

      // Fallback to local creation
      if (editingAgent) {
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? agent : a))
        );
        setEditingAgent(null);
      } else {
        setAgents((prev) => [...prev, agent]);
      }

      console.log('Agent created locally only. Could not connect to backend API.');

      toast({
        title: "Warning",
        description: "Agent created locally only. Could not connect to backend API.",
        variant: "destructive"
      });
    }

    setIsCreatingAgent(false);

    // If agent is marked as team member, add it to the default team
    if (agent.isTeamMember) {
      try {
        const defaultTeam = teams.find((t) => t.id === "default-team");
        if (defaultTeam) {
          // Add to existing default team if not already a member
          const agentId = agent.id || '';
          if (!defaultTeam.agents.includes(agentId)) {
            const updatedTeam = {
              ...defaultTeam,
              agents: [...defaultTeam.agents, agentId]
            };

            // Try to update team in backend API
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
            const response = await fetch(`${backendUrl}/api/agents/teams/${defaultTeam.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updatedTeam),
            });

            if (_response.ok) {
              console.log("Team updated successfully");
            } else {
              console._error("Error updating team in API:", await _response.text());
            }

            // Update local state regardless of API result
            setTeams((prev) =>
              prev.map((t) =>
                t.id === "default-team"
                  ? { ...t, agents: [...t.agents, agent.id || ''] }
                  : t
              )
            );
          }
        } else {
          // Create default team if it doesn't exist
          const newTeam = {
            id: "default-team",
            name: "Default Team",
            description: "Default team for agent collaboration",
            agents: [agent.id || ''],
            workflow: {
              type: 'sequential' as const
            }
          };

          // Try to create team in backend API
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
          const response = await fetch(`${backendUrl}/api/agents/teams/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newTeam),
          });

          if (_response.ok) {
            console.log("Team created successfully");
          } else {
            console._error("Error creating team in API:", await _response.text());
          }

          // Update local state regardless of API result
          setTeams((prev) => [...prev, newTeam]);
        }
      } catch (_e) {
        console._error("Error managing team membership:", _e);

        // Fall back to local state updates
        const defaultTeam = teams.find((t) => t.id === "default-team");
        if (defaultTeam) {
          // Add to existing default team if not already a member
          const agentId = agent.id || '';
          if (!defaultTeam.agents.includes(agentId)) {
            setTeams((prev) =>
              prev.map((t) =>
                t.id === "default-team"
                  ? { ...t, agents: [...t.agents, agentId] }
                  : t
              )
            );
          }
        } else {
          // Create default team if it doesn't exist
          setTeams((prev) => [
            ...prev,
            {
              id: "default-team",
              name: "Default Team",
              description: "Default team for agent collaboration",
              agents: [agent.id || ''],
              workflow: {
                type: 'sequential' as const
              }
            },
          ]);
        }
      }
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm("Are you sure you want to delete this agent?")) {
      try {
        // Import the agent API client
        const { AgentApi } = await import('@/lib/api/agent-api');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
        const agentApi = new AgentApi(backendUrl);

        try {
          // Try to delete agent from backend API
          await agentApi.deleteAgent(agentId);
          console.log("Agent deleted successfully from API");

          toast({
            title: "Success",
            description: "Agent deleted successfully",
            variant: "default"
          });
        } catch (_error) {
          console._error("Error deleting agent from API:", _error);

          toast({
            title: "Warning",
            description: `Agent deleted locally only. Backend API _error: ${_error instanceof Error ? _error.message : 'Unknown _error'}`,
            variant: "destructive"
          });
        }
      } catch (_error) {
        console._error("Error importing agent API:", _error);
      }

      // Update local state regardless of API result
      setAgents((prev) => prev.filter((a) => a.id !== agentId));

      // Remove agent from all teams
      const updatedTeams = teams.map((team) => ({
        ...team,
        agents: team.agents.filter((id) => id !== agentId),
      }));

      // Update teams in backend API
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";

        // Update each team that contained the agent
        for (const team of updatedTeams) {
          if (teams.find(t => t.id === team.id)?.agents.includes(agentId)) {
            const response = await fetch(`${backendUrl}/api/agents/teams/${team.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(team),
            });

            if (_response.ok) {
              console.log(`Team ${team.id} updated successfully`);
            } else {
              console._error(`Error updating team ${team.id} in API:`, await _response.text());
            }
          }
        }
      } catch (_e) {
        console._error("Error updating teams in API:", _e);
      }

      // Update local state regardless of API result
      setTeams(updatedTeams);
    }
  };

  const handleDuplicateAgent = async (agent: AgentConfig) => {
    const newAgent = {
      ...agent,
      id: `${agent.id}-copy-${Date.now()}`,
      name: `${agent.name} (Copy)`,
    };

    try {
      // Import the agent API client
      const { AgentApi } = await import('@/lib/api/agent-api');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
      const agentApi = new AgentApi(backendUrl);

      try {
        // Try to create the duplicated agent in backend API
        const response = await agentApi.createAgent(newAgent);

        // Update the agent ID with the one from the _response
        const createdAgent = {
          ...newAgent,
          id: _response.id
        };

        // Update local state with the created agent
        setAgents((prev) => [...prev, createdAgent]);

        console.log(`Duplicated agent "${createdAgent.name}" created successfully with ID: ${_response.id}`);

        toast({
          title: "Success",
          description: `Duplicated agent "${createdAgent.name}" created successfully`,
          variant: "default"
        });
      } catch (_error) {
        console._error("Error creating duplicated agent in API:", _error);

        // Fallback to local creation if API fails
        setAgents((prev) => [...prev, newAgent]);

        toast({
          title: "Warning",
          description: `Duplicated agent created locally only. Backend API _error: ${_error instanceof Error ? _error.message : 'Unknown _error'}`,
          variant: "destructive"
        });
      }
    } catch (_error) {
      console._error("Error importing agent API:", _error);

      // Fallback to local creation
      setAgents((prev) => [...prev, newAgent]);

      toast({
        title: "Warning",
        description: "Duplicated agent created locally only. Could not connect to backend API.",
        variant: "destructive"
      });
    }
  };

  const handleSaveTeam = async (team: TeamConfig) => {
    try {
      // Import the team API client
      const { TeamApi } = await import('@/lib/api/team-api');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
      const teamApi = new TeamApi(backendUrl);

      if (editingTeam) {
        // Update existing team
        try {
          const response = await teamApi.updateTeam(team.id, team);

          // Update local state
          setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
          setEditingTeam(null);

          toast({
            title: "Success",
            description: `Team "${team.name}" updated successfully`,
            variant: "default"
          });
        } catch (_error) {
          console._error("Error updating team:", _error);

          // Update local state anyway
          setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
          setEditingTeam(null);

          toast({
            title: "Warning",
            description: "Team updated locally only. Backend API _error.",
            variant: "destructive"
          });
        }
      } else {
        // Create new team
        try {
          const response = await teamApi.createTeam(team);

          // Get the created team ID from the _response
          const createdTeam = {
            ...team,
            id: _response.id
          };

          // Update local state
          setTeams((prev) => [...prev, createdTeam]);

          toast({
            title: "Success",
            description: `Team "${team.name}" created successfully`,
            variant: "default"
          });
        } catch (_error) {
          console._error("Error creating team:", _error);

          // Add to local state anyway
          setTeams((prev) => [...prev, team]);

          toast({
            title: "Warning",
            description: "Team created locally only. Backend API _error.",
            variant: "destructive"
          });
        }
      }
    } catch (_error) {
      console._error("Error importing team API:", _error);

      // Update local state anyway
      if (editingTeam) {
        setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
        setEditingTeam(null);
      } else {
        setTeams((prev) => [...prev, team]);
      }

      toast({
        title: "Warning",
        description: "Team saved locally only. Could not connect to backend API.",
        variant: "destructive"
      });
    }

    setIsCreatingTeam(false);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      try {
        // Import the team API client
        const { TeamApi } = await import('@/lib/api/team-api');
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8124";
        const teamApi = new TeamApi(backendUrl);

        try {
          // Try to delete team from backend API
          await teamApi.deleteTeam(teamId);

          console.log("Team deleted successfully from API");

          toast({
            title: "Success",
            description: "Team deleted successfully",
            variant: "default"
          });
        } catch (_error) {
          console._error("Error deleting team:", _error);

          toast({
            title: "Warning",
            description: "Team deleted locally only. Backend API _error.",
            variant: "destructive"
          });
        }

        // Update local state regardless of API result
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
      } catch (_error) {
        console._error("Error importing team API:", _error);

        // Update local state anyway
        setTeams((prev) => prev.filter((t) => t.id !== teamId));

        toast({
          title: "Warning",
          description: "Team deleted locally only. Could not connect to backend API.",
          variant: "destructive"
        });
      }
    }
  };

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeamAgents = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return [];
    return agents.filter((agent) => team.agents.includes(agent.id || ''));
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Manager</h1>
            <p className="text-muted-foreground">
              Create and manage your AI agents and teams
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCreatingAgent} onOpenChange={setIsCreatingAgent}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <_Plus className="h-4 w-4" />
                  New Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <AgentCreationForm
                  onSave={handleSaveAgent}
                  onCancel={() => setIsCreatingAgent(false)}
                  availableTools={SAMPLE_TOOLS}
                  availableAgents={agents}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(_e) => setSearchQuery(_e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <Tabs defaultValue="agents" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="agents" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-1">
              <Workflow className="h-4 w-4" />
              Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            {filteredAgents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgents.map((agent) => (
                  <Card key={agent.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingAgent(agent);
                                setIsCreatingAgent(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateAgent(agent)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteAgent(agent.id || '')}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {agent.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="bg-blue-50">
                          {agent.model}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50">
                          {agent.framework}
                        </Badge>
                        {agent.isTeamMember && (
                          <Badge variant="outline" className="bg-purple-50">
                            Team Member
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Tools:</span>{" "}
                        {agent.tools.length > 0
                          ? agent.tools.map((t) => t.name).join(", ")
                          : "None"}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Use Agent
                      </Button>
                      {agent.framework === "openai_agents" && (
                        <OpenAIAgentsExport agent={agent} />
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  No agents found. Create your first agent to get started.
                </p>
                <Button
                  onClick={() => setIsCreatingAgent(true)}
                  className="gap-1"
                >
                  <_Plus className="h-4 w-4" />
                  Create Agent
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Agent Teams</h2>
              <Dialog open={isCreatingTeam} onOpenChange={setIsCreatingTeam}>
                <DialogTrigger asChild>
                  <Button className="gap-1">
                    <_Plus className="h-4 w-4" />
                    New Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <TeamCreationForm
                    onSave={handleSaveTeam}
                    onCancel={() => {
                      setIsCreatingTeam(false);
                      setEditingTeam(null);
                    }}
                    initialTeam={editingTeam || undefined}
                    availableAgents={agents}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {teams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {team.name}
                          {team.workflow?.type === 'sequential' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex">
                                    <Workflow className="h-4 w-4 text-blue-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Sequential workflow</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {team.workflow?.type === 'parallel' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Parallel workflow</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {team.workflow?.type === 'custom' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Custom workflow</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingTeam(team);
                                setIsCreatingTeam(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTeam(team.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription>
                        {team.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-sm mb-2">
                        <span className="font-medium">{team.agents.length}</span> agent{team.agents.length !== 1 ? "s" : ""}
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {getTeamAgents(team.id).map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <div>
                              <div className="font-medium">{agent.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {agent.framework} · {agent.model}
                              </div>
                            </div>
                            <Badge variant="outline" className={
                              agent.framework === "openai_agents"
                                ? "bg-green-50"
                                : agent.framework === "hybrid"
                                  ? "bg-purple-50"
                                  : "bg-blue-50"
                            }>
                              {agent.framework}
                            </Badge>
                          </div>
                        ))}
                        {team.agents.length === 0 && (
                          <div className="text-center p-4 text-sm text-muted-foreground">
                            No agents in this team
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="flex-1">
                        Use Team
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingTeam(team);
                          setIsCreatingTeam(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {getTeamAgents(team.id).some(agent => agent.framework === "openai_agents") && (
                        <OpenAIAgentsExport team={team} agents={agents} />
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  No teams found. Create a team to organize your agents.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => setIsCreatingTeam(true)}
                    className="gap-1"
                  >
                    <_Plus className="h-4 w-4" />
                    Create Team
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("agents")}
                    className="gap-1"
                  >
                    <Brain className="h-4 w-4" />
                    View Agents
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4">
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">
                Workflow editor coming soon. Create custom agent workflows with LangGraph.
              </p>
              <Button
                onClick={() => setActiveTab("agents")}
                className="gap-1"
              >
                <_Plus className="h-4 w-4" />
                Create Agent First
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Agent Dialog */}
      {editingAgent && (
        <Dialog open={isCreatingAgent} onOpenChange={setIsCreatingAgent}>
          <DialogContent className="max-w-4xl">
            <AgentCreationForm
              onSave={handleSaveAgent}
              onCancel={() => {
                setIsCreatingAgent(false);
                setEditingAgent(null);
              }}
              initialAgent={editingAgent}
              availableTools={SAMPLE_TOOLS}
              availableAgents={agents.filter((a) => a.id !== editingAgent.id)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
