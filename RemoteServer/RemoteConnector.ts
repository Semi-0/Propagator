import { EventEmitter } from "events";
import type { Reactor } from "../Shared/Reactivity/Reactor";

export interface RemoteConnector<T = any> {
  // Connect to the remote endpoint
  connect(): Promise<void>;
  
  // Send data to the remote endpoint
  send(data: T): void;
  
  // Event emitter for receiving data and errors
  events: Reactor<any>;

  
  // Cleanup resources
  dispose(): void;
} 