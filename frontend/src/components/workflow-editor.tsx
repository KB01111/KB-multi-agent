'use client';

import React, { useState, useCallback, useRef } from 'react';

import type {
  Node,
  Edge
} from 'reactflow';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel
} from 'reactflow';

import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigg_er  } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Lab_el  } from '@/components/ui/label';

import { _Plus, Sav_e, Play  } from 'lucide-react';

// Custom node components
function AgentNode({ data }: { data: any }) {
  return (
    <div className="p-3 rounded-md bg-blue-100 border border-blue-300 shadow-sm">
      <div className="font-bold text-sm">{data.label}</div>
      <div className="text-xs text-gray-500">{data.description || 'Agent Node'}</div>
    </div>
  );
}

function ToolNode({ data }: { data: any }) {
  return (
    <div className="p-3 rounded-md bg-green-100 border border-green-300 shadow-sm">
      <div className="font-bold text-sm">{data.label}</div>
      <div className="text-xs text-gray-500">{data.description || 'Tool Node'}</div>
    </div>
  );
}

function ConditionNode({ data }: { data: any }) {
  return (
    <div className="p-3 rounded-md bg-yellow-100 border border-yellow-300 shadow-sm">
      <div className="font-bold text-sm">{data.label}</div>
      <div className="text-xs text-gray-500">{data.description || 'Condition Node'}</div>
    </div>
  );
}

// Node types
const nodeTypes = {
  agentNode: AgentNode,
  toolNode: ToolNode,
  conditionNode: ConditionNode
};

// Initial nodes and edges
const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'agentNode',
    position: { x: 250, y: 100 },
    data: { label: 'Start', description: 'Entry point' }
  }
];

const initialEdges: Edge[] = [];

export function WorkflowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [_reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [nodeType, setNodeType] = useState('agentNode');
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [workflowName, setWorkflowName] = useState('New Workflow');

  // Handle connections between nodes
  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle adding a new node
  const onAddNode = useCallback(() => {
    if (!nodeName) return;

    const newNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50
      },
      data: {
        label: nodeName,
        description: nodeDescription
      }
    };

    setNodes((nds) => nds.concat(newNode));
    setNodeName('');
    setNodeDescription('');
    setIsAddingNode(false);
  }, [nodeName, nodeDescription, nodeType, setNodes]);

  // Handle saving the workflow
  const onSaveWorkflow = useCallback(() => {
    const workflow = {
      name: workflowName,
      nodes: nodes,
      edges: edges
    };

    console.log('Saving workflow:', workflow);
    // Here you would typically save to the backend
    // For now, just log to console

    alert('Workflow saved!');
  }, [workflowName, nodes, edges]);

  // Handle running the workflow
  const onRunWorkflow = useCallback(() => {
    console.log('Running workflow with nodes:', nodes, 'and edges:', edges);
    // Here you would typically send to the backend to execute
    // For now, just log to console

    alert('Workflow execution started!');
  }, [nodes, edges]);

  return (
    <ReactFlowProvider>
      <div className="h-[80vh] w-full border rounded-md" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background color="#f8f8f8" gap={12} size={1} />

          <Panel position="top-left" className="bg-white p-2 rounded-md shadow-sm">
            <div className="flex items-center gap-2">
              <Input
                value={workflowName}
                onChange={(_e) => setWorkflowName(_e.target.value)}
                className="w-48"
                placeholder="Workflow Name"
              />
              <Button variant="outline" size="sm" onClick={onSaveWorkflow}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={onRunWorkflow}>
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            </div>
          </Panel>

          <Panel position="top-right" className="bg-white p-2 rounded-md shadow-sm">
            <Dialog open={isAddingNode} onOpenChange={setIsAddingNode}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <_Plus className="h-4 w-4 mr-1" />
                  Add Node
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Node</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nodeName">Node Name</Label>
                    <Input
                      id="nodeName"
                      value={nodeName}
                      onChange={(_e) => setNodeName(_e.target.value)}
                      placeholder="Enter node name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nodeDescription">Description</Label>
                    <Input
                      id="nodeDescription"
                      value={nodeDescription}
                      onChange={(_e) => setNodeDescription(_e.target.value)}
                      placeholder="Enter node description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nodeType">Node Type</Label>
                    <select
                      id="nodeType"
                      value={nodeType}
                      onChange={(_e) => setNodeType(_e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="agentNode">Agent</option>
                      <option value="toolNode">Tool</option>
                      <option value="conditionNode">Condition</option>
                    </select>
                  </div>
                  <Button onClick={onAddNode} className="w-full">
                    Add Node
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Panel>
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
