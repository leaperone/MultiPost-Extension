/* eslint-disable @typescript-eslint/no-explicit-any */

interface WorkflowRequest {
  inputs: any;
  response_mode?: "streaming" | "blocking";
  user: string;
}

interface CompletionResponse {
  workflow_run_id: string;
  task_id: string;
  data: {
    id: string;
    workflow_id: string;
    status: string;
    outputs?: any;
    error?: string;
    elapsed_time?: number;
    total_tokens?: number;
    total_steps: number;
    created_at: string;
    finished_at: string;
  };
}

interface WorkflowStreamResult {
  workflow_run_id: string;
  task_id: string;
  status: string;
  outputs: any;
  elapsed_time: number;
  total_tokens: number;
  events: ChunkData[];
}

type WorkflowResult = CompletionResponse | WorkflowStreamResult;

interface ChunkData {
  event: string;
  workflow_run_id: string;
  task_id: string;
  data: any;
}

interface WorkflowChannelCallbacks {
  onStart?: (data: { workflow_run_id: string; task_id: string }) => void;
  onNodeStart?: (data: { node_id: string; node_type: string; title: string }) => void;
  onTextChunk?: (text: string, from: string[]) => void;
  onNodeFinish?: (data: { node_id: string; status: string; outputs?: any; error?: string }) => void;
  onProgress?: (data: { current_step: number; total_steps?: number; elapsed_time?: number }) => void;
  onFinish?: (result: WorkflowStreamResult) => void;
  onError?: (error: Error | string) => void;
  onTTSChunk?: (audio: string) => void;
}

class WorkflowChannel {
  private callbacks: WorkflowChannelCallbacks = {};
  private stepCount = 0;

  constructor(callbacks: WorkflowChannelCallbacks = {}) {
    this.callbacks = callbacks;
  }

  onStart(callback: WorkflowChannelCallbacks['onStart']) {
    this.callbacks.onStart = callback;
    return this;
  }

  onNodeStart(callback: WorkflowChannelCallbacks['onNodeStart']) {
    this.callbacks.onNodeStart = callback;
    return this;
  }

  onTextChunk(callback: WorkflowChannelCallbacks['onTextChunk']) {
    this.callbacks.onTextChunk = callback;
    return this;
  }

  onNodeFinish(callback: WorkflowChannelCallbacks['onNodeFinish']) {
    this.callbacks.onNodeFinish = callback;
    return this;
  }

  onProgress(callback: WorkflowChannelCallbacks['onProgress']) {
    this.callbacks.onProgress = callback;
    return this;
  }

  onFinish(callback: WorkflowChannelCallbacks['onFinish']) {
    this.callbacks.onFinish = callback;
    return this;
  }

  onError(callback: WorkflowChannelCallbacks['onError']) {
    this.callbacks.onError = callback;
    return this;
  }

  onTTSChunk(callback: WorkflowChannelCallbacks['onTTSChunk']) {
    this.callbacks.onTTSChunk = callback;
    return this;
  }

  emit(event: string, data: any) {
    try {
      switch (event) {
        case 'start':
          this.callbacks.onStart?.(data);
          break;
        case 'node_start':
          this.stepCount++;
          this.callbacks.onNodeStart?.(data);
          this.callbacks.onProgress?.({ current_step: this.stepCount });
          break;
        case 'text_chunk':
          this.callbacks.onTextChunk?.(data.text, data.from_variable_selector);
          break;
        case 'node_finish':
          this.callbacks.onNodeFinish?.(data);
          break;
        case 'finish':
          this.callbacks.onFinish?.(data);
          break;
        case 'error':
          this.callbacks.onError?.(data);
          break;
        case 'tts_chunk':
          this.callbacks.onTTSChunk?.(data.audio);
          break;
      }
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }
}

class WorkflowClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async runWorkflow(request: WorkflowRequest): Promise<WorkflowResult> {
    // Default to streaming mode
    const requestWithDefaults = {
      ...request,
      response_mode: request.response_mode || "streaming"
    } as const;

    const response = await fetch(`${this.baseUrl}/v1/workflows/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.authToken}`,
        "Content-Type": "application/json",
        "Accept": "*/*",
        "User-Agent": "Deno/1.0.0",
      },
      body: JSON.stringify(requestWithDefaults),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (requestWithDefaults.response_mode === "blocking") {
      return await response.json() as CompletionResponse;
    } else {
      return await this.handleStreamingResponse(response);
    }
  }

  async runWorkflowWithChannel(request: WorkflowRequest, channel: WorkflowChannel): Promise<WorkflowStreamResult> {
    // Force streaming mode for channel
    const requestWithDefaults = {
      ...request,
      response_mode: "streaming" as const
    };

    try {
      const response = await fetch(`${this.baseUrl}/v1/workflows/run`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
          "Accept": "*/*",
          "User-Agent": "Deno/1.0.0",
        },
        body: JSON.stringify(requestWithDefaults),
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        channel.emit('error', error);
        throw error;
      }

      return await this.handleStreamingResponseWithChannel(response, channel);
    } catch (error) {
      channel.emit('error', error);
      throw error;
    }
  }

  async batchRun(requests: WorkflowRequest[]): Promise<WorkflowResult[]> {
    const promises = requests.map(request => this.runWorkflow(request));
    return Promise.all(promises);
  }

  async batchRunWithChannels(requests: WorkflowRequest[], channels: WorkflowChannel[]): Promise<WorkflowStreamResult[]> {
    if (requests.length !== channels.length) {
      throw new Error("Requests and channels arrays must have the same length");
    }

    const promises = requests.map((request, index) => 
      this.runWorkflowWithChannel(request, channels[index])
    );
    return Promise.all(promises);
  }

  private async handleStreamingResponse(response: Response): Promise<WorkflowStreamResult> {
    let finalOutputs: any = null;
    let workflowStatus = "";
    let workflowId = "";
    let taskId = "";
    let elapsedTime = 0;
    let totalTokens = 0;
    const events: ChunkData[] = [];

    for await (const chunk of this.parseStreamingResponse(response)) {
      events.push(chunk);
      
      switch (chunk.event) {
        case "workflow_started":
          workflowId = chunk.data.id;
          taskId = chunk.task_id;
          break;
          
        case "workflow_finished":
          finalOutputs = chunk.data.outputs;
          workflowStatus = chunk.data.status;
          elapsedTime = chunk.data.elapsed_time || 0;
          totalTokens = chunk.data.total_tokens || 0;
          break;
      }
    }

    return {
      workflow_run_id: workflowId,
      task_id: taskId,
      status: workflowStatus,
      outputs: finalOutputs,
      elapsed_time: elapsedTime,
      total_tokens: totalTokens,
      events
    };
  }

  private async handleStreamingResponseWithChannel(response: Response, channel: WorkflowChannel): Promise<WorkflowStreamResult> {
    let finalOutputs: any = null;
    let workflowStatus = "";
    let workflowId = "";
    let taskId = "";
    let elapsedTime = 0;
    let totalTokens = 0;
    const events: ChunkData[] = [];

    try {
      for await (const chunk of this.parseStreamingResponse(response)) {
        events.push(chunk);
        
        switch (chunk.event) {
          case "workflow_started":
            workflowId = chunk.data.id;
            taskId = chunk.task_id;
            channel.emit('start', { workflow_run_id: workflowId, task_id: taskId });
            break;
            
          case "node_started":
            channel.emit('node_start', {
              node_id: chunk.data.node_id,
              node_type: chunk.data.node_type,
              title: chunk.data.title
            });
            break;
            
          case "text_chunk":
            channel.emit('text_chunk', {
              text: chunk.data.text,
              from_variable_selector: chunk.data.from_variable_selector
            });
            break;
            
          case "node_finished":
            channel.emit('node_finish', {
              node_id: chunk.data.node_id,
              status: chunk.data.status,
              outputs: chunk.data.outputs,
              error: chunk.data.error
            });
            break;
            
          case "workflow_finished":
            finalOutputs = chunk.data.outputs;
            workflowStatus = chunk.data.status;
            elapsedTime = chunk.data.elapsed_time || 0;
            totalTokens = chunk.data.total_tokens || 0;
            
            const result: WorkflowStreamResult = {
              workflow_run_id: workflowId,
              task_id: taskId,
              status: workflowStatus,
              outputs: finalOutputs,
              elapsed_time: elapsedTime,
              total_tokens: totalTokens,
              events
            };
            
            channel.emit('finish', result);
            break;
            
          case "tts_message":
            channel.emit('tts_chunk', { audio: chunk.data.audio });
            break;
        }
      }
    } catch (error) {
      channel.emit('error', error);
      throw error;
    }

    return {
      workflow_run_id: workflowId,
      task_id: taskId,
      status: workflowStatus,
      outputs: finalOutputs,
      elapsed_time: elapsedTime,
      total_tokens: totalTokens,
      events
    };
  }

  private async *parseStreamingResponse(response: Response): AsyncGenerator<ChunkData> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error("No response body");
    }

    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Split by double newlines to separate chunks
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || ""; // Keep the last incomplete chunk
        
        for (const chunk of chunks) {
          if (chunk.trim() && chunk.startsWith("data: ")) {
            try {
              const jsonData = chunk.slice(6); // Remove "data: " prefix
              const parsedData = JSON.parse(jsonData) as ChunkData;
              yield parsedData;
            } catch (error) {
              console.error("Error parsing chunk:", error, chunk);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export { WorkflowClient, WorkflowChannel, type WorkflowRequest, type CompletionResponse, type ChunkData, type WorkflowResult, type WorkflowStreamResult, type WorkflowChannelCallbacks };