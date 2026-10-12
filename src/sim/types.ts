// The sim's shared types (spec section 14).
import type { Gauntlet } from '../rooms/gauntlet.ts';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Entity {
  letter: string;
  kind: 'spike' | 'block';
  dir: Dir | null;
  layer: number;
  period: number;
  phase: number;
  on: number;
  rest: boolean;
  cells: [number, number][];
  index: number;
}

export interface Room {
  kind: 'room' | 'gauntlet';
  name: string;
  W: number;
  H: number;
  spawn: { col: number; row: number };
  layer: number;
  par: number;
  tiles: Uint8Array;
  entities: Entity[];
}

export interface World {
  rooms: Room[];
  gauntlet: (Room & { grid: string; program: Gauntlet }) | null;
}

export interface StartState {
  room: number;
  step: number;
  layers: number;
  stopAtClear?: boolean;
}

export interface SimStatus {
  room: number;
  cleared: number;
  dead: boolean;
  deaths: number;
  finished: boolean;
  x: number;
  y: number;
  form: number;
}

export interface Sim {
  readonly step: number;
  tick(input: number): void;
  status(): SimStatus;
  checksum(): string;
  save(): Int32Array;
  load(state: Int32Array): void;
  key(period: number): string;
}
