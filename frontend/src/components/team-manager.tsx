'use client';

import React, { useState, useEffect } from 'react';

import { Plus, Users, Trash2, Edit } from 'lucide-react';

import type { AgentConfig } from '@/components/agent-creation-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export interface TeamConfig {
  id: string;
  name: string;
  description: string;
  agents: string[]; // Agent IDs
  workflow?: any; // Optional workflow configuration
}

interface TeamManagerProps {
  availableAgents: AgentConfig[];
}

export function TeamManager({ availableAgents }: TeamManagerProps) {
  const [teams, setTeams] = useState<TeamConfig[]>([]);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const { toast } = useToast();

  // Load teams (mock implementation)
  useEffect(() => {
    // In a real implementation, you would fetch from the backend
    setTeams([
      {
        id: 'team-1',
        name: 'Research Team',
        description: 'A team for research tasks',
        agents: ['agent-1', 'agent-2']
      }
    ]);
  }, []);

  const handleCreateTeam = () => {
    if (!teamName) {
      toast({
        title: 'Error',
        description: 'Team name is required',
        variant: 'destructive'
      });
      return;
    }

    if (selectedAgents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one agent',
        variant: 'destructive'
      });
      return;
    }

    const newTeam: TeamConfig = {
      id: `team-${Date.now()}`,
      name: teamName,
      description: teamDescription,
      agents: selectedAgents
    };

    setTeams([...teams, newTeam]);
    setIsCreatingTeam(false);
    setTeamName('');
    setTeamDescription('');
    setSelectedAgents([]);

    toast({
      title: 'Success',
      description: `Team "${teamName}" created successfully`,
      variant: 'default'
    });
  };

  const handleDeleteTeam = (teamId: string) => {
    setTeams(teams.filter(team => team.id !== teamId));

    toast({
      title: 'Success',
      description: 'Team deleted successfully',
      variant: 'default'
    });
  };

  const toggleAgentSelection = (agentId: string) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Manager</h1>
            <p className="text-muted-foreground">
              Create and manage your agent teams
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCreatingTeam} onOpenChange={setIsCreatingTeam}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  New Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter team name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamDescription">Description</Label>
                    <Input
                      id="teamDescription"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Enter team description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Agents</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                      {availableAgents.map(agent => (
                        <div key={agent.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`agent-${agent.id}`}
                            checked={agent.id ? selectedAgents.includes(agent.id) : false}
                            onChange={() => agent.id && toggleAgentSelection(agent.id)}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`agent-${agent.id}`} className="text-sm">
                            {agent.name}
                          </label>
                        </div>
                      ))}
                      {availableAgents.length === 0 && (
                        <p className="text-sm text-gray-500">No agents available. Create agents first.</p>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleCreateTeam} className="w-full">
                    Create Team
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{team.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Team Members</Label>
                  <div className="space-y-1">
                    {team.agents.map(agentId => {
                      const agent = availableAgents.find(a => a.id === agentId);
                      return (
                        <div key={agentId} className="text-sm flex items-center space-x-2">
                          <Users className="h-3 w-3" />
                          <span>{agent?.name || agentId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Team
                </Button>
              </CardFooter>
            </Card>
          ))}
          {teams.length === 0 && (
            <div className="col-span-full text-center p-8 border rounded-lg">
              <p className="text-muted-foreground">No teams created yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreatingTeam(true)}
              >
                Create your first team
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
