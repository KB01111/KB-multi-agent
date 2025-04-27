'use client';

import React, { useState } from 'react';

import { Copy, Download, Code, FileCode } from 'lucide-react';

import type { AgentConfig } from '@/components/agent-creation-form';
import type { TeamConfig } from '@/components/team-creation-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

interface OpenAIAgentsExportProps {
  agent?: AgentConfig;
  team?: TeamConfig;
  agents?: AgentConfig[];
}

export function OpenAIAgentsExport({ agent, team, agents }: OpenAIAgentsExportProps) {
  const [activeTab, setActiveTab] = useState('python');
  const { toast } = useToast();

  // Generate Python code for a single agent
  const generateAgentPythonCode = (agent: AgentConfig): string => {
    const toolsCode = agent.tools.map(tool => {
      if (tool.type === 'function') {
        const toolId = tool.id ? tool.id.replace(/-/g, '_') : `tool_${tool.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        return `
@function_tool
def ${toolId}(*args, **kwargs):
    """${tool.description}"""
    # Implement your function logic here
    return f"Response from ${tool.name}"`;
      }
      return '';
    }).filter(Boolean).join('\n\n');

    const agentOptions = [];
    if (agent.enableTracing) agentOptions.push('# Tracing is enabled');
    if (agent.enableVoice) agentOptions.push('# Voice capabilities are enabled');
    if (agent.enableParallel) agentOptions.push('# Parallel execution is enabled');
    if (agent.enableLiteLLM) agentOptions.push('# LiteLLM integration is enabled');

    return `
import asyncio
from agents import Agent, Runner, function_tool

${toolsCode || '# No function tools defined'}

${agent.tools.some(t => t.type === 'agent') ? '# Agent tools would be defined here' : ''}

async def main():
    # Create the agent
    ${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')} = Agent(
        name="${agent.name}",
        instructions="""${agent.instructions}""",
        model="${agent.model}",
        ${agent.tools.length > 0 ? 'tools=[' + agent.tools.map(t => t.id ? t.id.replace(/-/g, '_') : `tool_${t.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`).join(', ') + '],' : ''}
    )

    ${agentOptions.join('\n    ')}

    # Example usage
    result = await Runner.run(${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}, "Hello, how can you help me?")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
`;
  };

  // Generate Python code for a team of agents
  const generateTeamPythonCode = (team: TeamConfig, allAgents: AgentConfig[]): string => {
    const teamAgents = allAgents.filter(a => a.id && team.agents && team.agents.includes(a.id));

    const agentsCode = teamAgents.map(agent => {
      return `
# Create ${agent.name} agent
${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')} = Agent(
    name="${agent.name}",
    instructions="""${agent.instructions}""",
    model="${agent.model}",
    ${agent.tools.length > 0 ? 'tools=[' + agent.tools.map(t => t.id ? t.id.replace(/-/g, '_') : `tool_${t.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`).join(', ') + '],' : ''}
)`;
    }).join('\n');

    const workflowType = team.workflow?.type || 'sequential';
    let workflowCode = '';

    if (workflowType === 'sequential') {
      workflowCode = `
# Sequential workflow - agents will be called one after another
async def run_sequential_workflow(user_input):
    result = user_input
    ${teamAgents.map(agent => {
      const agentVar = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `
    # Run ${agent.name}
    agent_result = await Runner.run(${agentVar}, result)
    result = agent_result.final_output`;
    }).join('')}

    return result`;
    } else if (workflowType === 'parallel') {
      workflowCode = `
# Parallel workflow - agents will be called simultaneously
async def run_parallel_workflow(user_input):
    tasks = [
        ${teamAgents.map(agent => {
          const agentVar = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          return `Runner.run(${agentVar}, user_input)`;
        }).join(',\n        ')}
    ]

    results = await asyncio.gather(*tasks)

    # Combine results (this is a simple example)
    combined_result = "\\n\\n".join([result.final_output for result in results])
    return combined_result`;
    } else {
      workflowCode = `
# Custom workflow - implement your own logic here
async def run_custom_workflow(user_input):
    # This is just an example of a custom workflow
    # You can implement any logic you want here

    # First agent processes the input
    first_result = await Runner.run(${teamAgents[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'first_agent'}, user_input)

    # Based on the result, decide which agent to call next
    if "question" in first_result.final_output.lower():
        second_result = await Runner.run(${teamAgents[1]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'second_agent'}, first_result.final_output)
    else:
        second_result = await Runner.run(${teamAgents[2]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'third_agent'}, first_result.final_output)

    return second_result.final_output`;
    }

    return `
import asyncio
from agents import Agent, Runner, function_tool, trace

# Define your tools here
# @function_tool
# def example_tool(param: str) -> str:
#     """Example tool description"""
#     return f"Result for {param}"

${agentsCode}

${workflowCode}

async def main():
    # Example usage
    with trace("${team.name} Workflow"):
        result = await run_${workflowType}_workflow("Hello, I need help with a task.")
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
`;
  };

  // Generate JavaScript code for a single agent
  const generateAgentJavaScriptCode = (agent: AgentConfig): string => {
    return `
import { Agent, Runner } from 'openai-agents';

// Create the agent
const ${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')} = new Agent({
  name: "${agent.name}",
  instructions: \`${agent.instructions}\`,
  model: "${agent.model}",
  ${agent.tools.length > 0 ? 'tools: [' + agent.tools.map(t => `{ name: "${t.name}", description: "${t.description}" }`).join(', ') + '],' : ''}
});

// Example usage
async function main() {
  const result = await Runner.run(${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}, "Hello, how can you help me?");
  console.log(result.finalOutput);
}

main().catch(console.error);
`;
  };

  // Generate JavaScript code for a team of agents
  const generateTeamJavaScriptCode = (team: TeamConfig, allAgents: AgentConfig[]): string => {
    const teamAgents = allAgents.filter(a => a.id && team.agents && team.agents.includes(a.id));

    const agentsCode = teamAgents.map(agent => {
      return `
// Create ${agent.name} agent
const ${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')} = new Agent({
  name: "${agent.name}",
  instructions: \`${agent.instructions}\`,
  model: "${agent.model}",
  ${agent.tools.length > 0 ? 'tools: [' + agent.tools.map(t => `{ name: "${t.name}", description: "${t.description}" }`).join(', ') + '],' : ''}
});`;
    }).join('\n');

    const workflowType = team.workflow?.type || 'sequential';
    let workflowCode = '';

    if (workflowType === 'sequential') {
      workflowCode = `
// Sequential workflow - agents will be called one after another
async function runSequentialWorkflow(userInput) {
  let result = userInput;
  ${teamAgents.map(agent => {
    const agentVar = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `
  // Run ${agent.name}
  const ${agentVar}Result = await Runner.run(${agentVar}, result);
  result = ${agentVar}Result.finalOutput;`;
  }).join('')}

  return result;
}`;
    } else if (workflowType === 'parallel') {
      workflowCode = `
// Parallel workflow - agents will be called simultaneously
async function runParallelWorkflow(userInput) {
  const tasks = [
    ${teamAgents.map(agent => {
      const agentVar = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `Runner.run(${agentVar}, userInput)`;
    }).join(',\n    ')}
  ];

  const results = await Promise.all(tasks);

  // Combine results (this is a simple example)
  const combinedResult = results.map(result => result.finalOutput).join('\n\n');
  return combinedResult;
}`;
    } else {
      workflowCode = `
// Custom workflow - implement your own logic here
async function runCustomWorkflow(userInput) {
  // This is just an example of a custom workflow
  // You can implement any logic you want here

  // First agent processes the input
  const firstResult = await Runner.run(${teamAgents[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'firstAgent'}, userInput);

  // Based on the result, decide which agent to call next
  let secondResult;
  if (firstResult.finalOutput.toLowerCase().includes("question")) {
    secondResult = await Runner.run(${teamAgents[1]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'secondAgent'}, firstResult.finalOutput);
  } else {
    secondResult = await Runner.run(${teamAgents[2]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'thirdAgent'}, firstResult.finalOutput);
  }

  return secondResult.finalOutput;
}`;
    }

    return `
import { Agent, Runner, trace } from 'openai-agents';

${agentsCode}

${workflowCode}

// Example usage
async function main() {
  const result = await trace("${team.name} Workflow", async () => {
    return await run${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)}Workflow("Hello, I need help with a task.");
  });

  console.log(result);
}

main().catch(console.error);
`;
  };

  const getCode = () => {
    if (agent) {
      return activeTab === 'python'
        ? generateAgentPythonCode(agent)
        : generateAgentJavaScriptCode(agent);
    } else if (team && agents) {
      return activeTab === 'python'
        ? generateTeamPythonCode(team, agents)
        : generateTeamJavaScriptCode(team, agents);
    }
    return '# No agent or team selected';
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCode());
    toast({
      title: "Code copied",
      description: "The code has been copied to your clipboard",
      duration: 3000,
    });
  };

  const handleDownloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([getCode()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);

    const filename = agent
      ? `${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_agent.${activeTab === 'python' ? 'py' : 'js'}`
      : `${team?.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'team'}_workflow.${activeTab === 'python' ? 'py' : 'js'}`;

    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Code className="h-4 w-4" />
          Export to OpenAI Agents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Export to OpenAI Agents SDK
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs defaultValue="python" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="python" className="flex items-center gap-1">
                <FileCode className="h-4 w-4" />
                Python
              </TabsTrigger>
              <TabsTrigger value="javascript" className="flex items-center gap-1">
                <FileCode className="h-4 w-4" />
                JavaScript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="python" className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-50 rounded-md overflow-auto max-h-96">
                  <code className="text-sm font-mono">{getCode()}</code>
                </pre>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-8 w-8 bg-slate-800 hover:bg-slate-700">
                    <Copy className="h-4 w-4 text-slate-200" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDownloadCode} className="h-8 w-8 bg-slate-800 hover:bg-slate-700">
                    <Download className="h-4 w-4 text-slate-200" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>This code uses the OpenAI Agents Python SDK. To run it:</p>
                <ol className="list-decimal pl-5 space-y-1 mt-2">
                  <li>Install the SDK: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">pip install openai-agents</code></li>
                  <li>Set your OpenAI API key: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">export OPENAI_API_KEY=sk-...</code></li>
                  <li>Save the code to a file and run it: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">python your_file.py</code></li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-50 rounded-md overflow-auto max-h-96">
                  <code className="text-sm font-mono">{getCode()}</code>
                </pre>
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-8 w-8 bg-slate-800 hover:bg-slate-700">
                    <Copy className="h-4 w-4 text-slate-200" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDownloadCode} className="h-8 w-8 bg-slate-800 hover:bg-slate-700">
                    <Download className="h-4 w-4 text-slate-200" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>This code uses the OpenAI Agents JavaScript SDK. To run it:</p>
                <ol className="list-decimal pl-5 space-y-1 mt-2">
                  <li>Install the SDK: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">npm install openai-agents</code></li>
                  <li>Set your OpenAI API key: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">export OPENAI_API_KEY=sk-...</code></li>
                  <li>Save the code to a file and run it: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">node your_file.js</code></li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">About OpenAI Agents SDK</h4>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              The OpenAI Agents SDK is a powerful framework for building AI agents with advanced capabilities.
              This export provides a starting point for using your agent configuration with the SDK.
              You&apos;ll need to implement the actual tool functionality and customize the code for your specific use case.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
