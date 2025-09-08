import type { Graph, Patch, Id } from '../core/csi.js';
import { SeededRNG } from './seed.js';

// Event types for JSONL logging
export type Event = 
  | { t: number; kind: "BEGIN_EPISODE"; seed: number }
  | { t: number; kind: "PATCH"; id: string; cell: string; delta: unknown }
  | { t: number; kind: "FIRE"; id: string; prop: string; inputs: Record<string, unknown>; delta: Record<string, unknown> }
  | { t: number; kind: "JOIN"; id: string; cell: string; before: unknown; delta: unknown; after: unknown }
  | { t: number; kind: "CONTRADICTION"; cell: string; evidence: unknown }
  | { t: number; kind: "COMMIT" }
  | { t: number; kind: "END_EPISODE" };

export class EpisodeLogger {
  private events: Event[] = [];
  private currentTime = 0;
  private rng: SeededRNG;
  private episodeId: string;
  
  constructor(seed: number) {
    this.rng = new SeededRNG(seed);
    this.episodeId = this.rng.nextString(8);
  }
  
  private nextTime(): number {
    this.currentTime += 1;
    return this.currentTime;
  }
  
  beginEpisode(seed: number): void {
    this.events.push({
      t: this.nextTime(),
      kind: "BEGIN_EPISODE",
      seed
    });
  }
  
  applyPatch(patch: Patch): void {
    this.events.push({
      t: this.nextTime(),
      kind: "PATCH",
      id: this.episodeId,
      cell: patch.cellId,
      delta: patch.delta
    });
  }
  
  recordFire(propId: Id, inputs: Record<string, unknown>, delta: Record<string, unknown>): void {
    this.events.push({
      t: this.nextTime(),
      kind: "FIRE",
      id: this.episodeId,
      prop: propId,
      inputs,
      delta
    });
  }
  
  recordJoin(cellId: Id, before: unknown, delta: unknown, after: unknown): void {
    this.events.push({
      t: this.nextTime(),
      kind: "JOIN",
      id: this.episodeId,
      cell: cellId,
      before,
      delta,
      after
    });
  }
  
  recordContradiction(cellId: Id, evidence: unknown): void {
    this.events.push({
      t: this.nextTime(),
      kind: "CONTRADICTION",
      cell: cellId,
      evidence
    });
  }
  
  commit(): void {
    this.events.push({
      t: this.nextTime(),
      kind: "COMMIT"
    });
  }
  
  endEpisode(): void {
    this.events.push({
      t: this.nextTime(),
      kind: "END_EPISODE"
    });
  }
  
  getEvents(): Event[] {
    return [...this.events];
  }
  
  addEvent(event: Event): void {
    this.events.push(event);
  }
  
  clear(): void {
    this.events = [];
    this.currentTime = 0;
  }
  
  exportJSONL(): string {
    return this.events.map(event => JSON.stringify(event)).join('\n');
  }
  
  // Snapshot the current graph state
  snapshot(graph: Graph): Buffer {
    const snapshot = {
      cells: Array.from(graph.cells.entries()),
      props: Array.from(graph.props.entries()),
      depsOut: Array.from(graph.depsOut.entries()),
      depsIn: Array.from(graph.depsIn.entries()),
      prodOut: Array.from(graph.prodOut.entries())
    };
    return Buffer.from(JSON.stringify(snapshot));
  }
  
  // Restore graph from snapshot
  restore(buffer: Buffer): Graph {
    const snapshot = JSON.parse(buffer.toString());
    return {
      cells: new Map(snapshot.cells),
      props: new Map(snapshot.props),
      depsOut: new Map(snapshot.depsOut),
      depsIn: new Map(snapshot.depsIn),
      prodOut: new Map(snapshot.prodOut)
    };
  }
  
  // Get the RNG for deterministic replay
  getRNG(): SeededRNG {
    return this.rng;
  }
  
  // Get episode ID
  getEpisodeId(): string {
    return this.episodeId;
  }
  
  // Reset for a new episode
  reset(seed: number): void {
    this.events = [];
    this.currentTime = 0;
    this.rng = new SeededRNG(seed);
    this.episodeId = this.rng.nextString(8);
  }
}

// Global episode logger instance
let globalLogger: EpisodeLogger | null = null;

export function getLogger(): EpisodeLogger {
  if (!globalLogger) {
    throw new Error("Logger not initialized. Call beginEpisode() first.");
  }
  return globalLogger;
}

export function beginEpisode(seed: number): EpisodeLogger {
  globalLogger = new EpisodeLogger(seed);
  globalLogger.beginEpisode(seed);
  return globalLogger;
}

export function applyPatch(patch: Patch): void {
  getLogger().applyPatch(patch);
}

export function recordFire(propId: Id, inputs: Record<string, unknown>, delta: Record<string, unknown>): void {
  getLogger().recordFire(propId, inputs, delta);
}

export function recordJoin(cellId: Id, before: unknown, delta: unknown, after: unknown): void {
  getLogger().recordJoin(cellId, before, delta, after);
}

export function recordContradiction(cellId: Id, evidence: unknown): void {
  getLogger().recordContradiction(cellId, evidence);
}

export function commit(): void {
  getLogger().commit();
}

export function endEpisode(): void {
  getLogger().endEpisode();
}

export function snapshot(graph: Graph): Buffer {
  return getLogger().snapshot(graph);
}

export function restore(buffer: Buffer): Graph {
  return getLogger().restore(buffer);
}

// Global event capture for integration with main propagator system
let globalEventCapture: ((event: Event) => void) | null = null;

export function setGlobalEventCapture(capture: ((event: Event) => void) | null) {
    globalEventCapture = capture;
}

export function captureEvent(event: Event) {
    if (globalEventCapture) {
        globalEventCapture(event);
    }
}

// Helper functions for the main propagator system to call
export function recordFireFromSystem(propagatorId: string, propagatorName: string, inputs: Record<string, any>, delta: Record<string, any>) {
    const event: Event = {
        t: Date.now(),
        kind: "FIRE",
        id: propagatorId,
        prop: propagatorName,
        inputs,
        delta
    };
    captureEvent(event);
}

export function recordJoinFromSystem(cellId: string, cellName: string, before: any, delta: any, after: any) {
    const event: Event = {
        t: Date.now(),
        kind: "JOIN",
        id: cellId,
        cell: cellName,
        before,
        delta,
        after
    };
    captureEvent(event);
}

export function recordContradictionFromSystem(cellName: string, evidence: any) {
    const event: Event = {
        t: Date.now(),
        kind: "CONTRADICTION",
        cell: cellName,
        evidence
    };
    captureEvent(event);
}
