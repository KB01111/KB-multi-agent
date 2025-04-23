import React, { FC, useState, useEffect, useRef } from "react";
import { AvailableAgents } from "@/lib/available-agents";
import { useCoAgent, useCoAgentStateRender } from "@copilotkit/react-core";
import { CheckCircleIcon } from "lucide-react";
import { KnowledgeGraph } from "@/components/knowledge-graph";

export type KnowledgeAgentState = {
  query: string;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    properties: Record<string, any>;
  }>;
  relations: Array<{
    source_id: string;
    target_id: string;
    type: string;
    properties?: Record<string, any>;
  }>;
  logs: Array<{
    message: string;
    done: boolean;
  }>;
};

export const KnowledgeAgent: FC = () => {
  const [logs, setLogs] = useState<
    Array<{
      message: string;
      done: boolean;
    }>
  >([]);
  
  const isProcessing = useRef(false);

  const { state: knowledgeAgentState, stop: stopKnowledgeAgent } = useCoAgent<KnowledgeAgentState>({
    name: AvailableAgents.KNOWLEDGE_AGENT,
    initialState: {
      query: "",
      entities: [],
      relations: [],
      logs: [],
    },
  });

  useEffect(() => {
    if (knowledgeAgentState.logs) {
      setLogs((prevLogs) => {
        const newLogs = [...prevLogs];
        knowledgeAgentState.logs.forEach((log) => {
          const existingLogIndex = newLogs.findIndex(
            (l) => l.message === log.message
          );
          if (existingLogIndex >= 0) {
            if (log.done && !newLogs[existingLogIndex].done) {
              newLogs[existingLogIndex].done = true;
            }
          } else {
            newLogs.push(log);
          }
        });
        return newLogs;
      });
    }
  }, [knowledgeAgentState.logs]);

  useCoAgentStateRender({
    name: AvailableAgents.KNOWLEDGE_AGENT,
    handler: ({ nodeName }) => {
      if (nodeName === "__end__") {
        setTimeout(() => {
          stopKnowledgeAgent();
        }, 1000);
      }
    },
    render: ({ status }) => {
      if (status === "inProgress") {
        isProcessing.current = true;
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Processing your knowledge query...</h3>
            <ul className="space-y-2">
              {logs.map((log, idx) => (
                <li key={idx} className="flex items-start">
                  <span className={`mr-2 ${log.done ? "text-green-500" : "text-gray-400"}`}>
                    {log.done ? "✓" : "⟳"}
                  </span>
                  <span>{log.message}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      if (status === "complete") {
        isProcessing.current = false;
        return (
          <div>
            <div className="prose max-w-none">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <CheckCircleIcon className="h-5 w-5" />
                <span>Knowledge query complete</span>
              </div>
            </div>
          </div>
        );
      }
    },
  });

  if (isProcessing.current) {
    return (
      <div className="flex flex-col gap-4 h-full z-[999]">
        <div className="animate-pulse p-6 bg-white rounded-lg shadow-sm">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6 mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full z-[999]">
      <div className="flex flex-col gap-2 p-6 bg-white rounded-lg shadow-sm h-full">
        <KnowledgeGraph />
      </div>
    </div>
  );
};
