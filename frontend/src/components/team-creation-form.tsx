'use client';

import React, { useState } from 'react';

import { X, _Plus, Us_ers  } from 'lucide-react';

import type { AgentConfig } from '@/components/agent-creation-form';
import { Badg_e  } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFoot_er  } from '@/components/ui/card';
import { Ch_eckbox  } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Lab_el  } from '@/components/ui/label';
import { ScrollAr_ea  } from '@/components/ui/scroll-area';
import { Textar_ea  } from '@/components/ui/textarea';

export interface TeamConfig {
  id: string;
  name: string;
  description: string;
  agents: string[]; // Agent IDs
  workflow?: {
    type: 'sequential' | 'parallel' | 'custom';
    config?: any;
  };
}

const DEFAULT_TEAM: TeamConfig = {
  id: '',
  name: '',
  description: '',
  agents: [],
  workflow: {
    type: 'sequential',
    config: {}
  }
};

interface TeamCreationFormProps {
  onSave: (team: TeamConfig) => void;
  onCancel: () => void;
  initialTeam?: TeamConfig;
  availableAgents: AgentConfig[];
}

export const TeamCreationForm: React.FC<TeamCreationFormProps> = ({
  onSave,
  onCancel,
  initialTeam,
  availableAgents = []
}) => {
  const [team, setTeam] = useState<TeamConfig>(
    initialTeam || { ...DEFAULT_TEAM, id: `team-${Date.now()}` }
  );

  const handleChange = (
    _e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = _e.target;
    setTeam((prev) => ({ ...prev, [name]: value }));
  };

  const handleAgentToggle = (agentId: string) => {
    setTeam((prev) => {
      if (prev.agents.includes(agentId)) {
        return {
          ...prev,
          agents: prev.agents.filter(id => id !== agentId)
        };
      } else {
        return {
          ...prev,
          agents: [...prev.agents, agentId]
        };
      }
    });
  };

  const handleWorkflowTypeChange = (type: 'sequential' | 'parallel' | 'custom') => {
    setTeam((prev) => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        type
      }
    }));
  };

  const handleSubmit = (_e: React.FormEvent) => {
    _e.preventDefault();
    onSave(team);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            {initialTeam ? "Edit Team" : "Create New Team"}
          </CardTitle>
          <CardDescription>
            Configure your AI agent team for collaborative problem-solving
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                name="name"
                value={team.name}
                onChange={handleChange}
                placeholder="_e.g., Research Team"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">Team ID</Label>
              <Input
                id="id"
                name="id"
                value={team.id}
                onChange={handleChange}
                placeholder="_e.g., research-team"
                required
                disabled={!!initialTeam}
              />
              {!initialTeam && (
                <p className="text-xs text-muted-foreground">
                  A unique identifier for your team
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={team.description}
              onChange={handleChange}
              placeholder="Describe what this team is designed to do..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Team Members</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Select agents to include in this team
            </p>

            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-2">
                {team.agents.map(agentId => {
                  const agent = availableAgents.find(a => a.id === agentId);
                  return agent ? (
                    <Badge key={agentId} variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {agent.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleAgentToggle(agentId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ) : null;
                })}
                {team.agents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No agents selected</p>
                )}
              </div>
            </div>

            <ScrollArea className="h-60 border rounded-md p-4">
              <div className="space-y-2">
                {availableAgents.map(agent => (
                  <div key={agent.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`agent-${agent.id}`}
                      checked={agent.id && team.agents ? team.agents.includes(agent.id) : false}
                      onCheckedChange={() => agent.id && handleAgentToggle(agent.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`agent-${agent.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {agent.name}
                        <Badge variant="outline" className="ml-2">
                          {agent.framework}
                        </Badge>
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {agent.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                ))}
                {availableAgents.length === 0 && (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground">No agents available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create agents first before creating a team
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Workflow Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div
                className={`border rounded-md p-3 cursor-pointer ${
                  team.workflow?.type === 'sequential' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleWorkflowTypeChange('sequential')}
              >
                <h4 className="font-medium">Sequential</h4>
                <p className="text-sm text-muted-foreground">
                  Agents work one after another in order
                </p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${
                  team.workflow?.type === 'parallel' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleWorkflowTypeChange('parallel')}
              >
                <h4 className="font-medium">Parallel</h4>
                <p className="text-sm text-muted-foreground">
                  Agents work simultaneously on tasks
                </p>
              </div>
              <div
                className={`border rounded-md p-3 cursor-pointer ${
                  team.workflow?.type === 'custom' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleWorkflowTypeChange('custom')}
              >
                <h4 className="font-medium">Custom</h4>
                <p className="text-sm text-muted-foreground">
                  Define your own workflow logic
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!team.name || team.agents.length === 0}
          >
            {initialTeam ? "Update Team" : "Create Team"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
