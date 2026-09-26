export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  readonly colors: number;
  readonly empty: number;
}

export interface GameSnapshot {
  readonly state: number[][];
  readonly moves: number;
}

export interface StorageData {
  readonly diff: Difficulty;
  readonly solvedCount: number;
}

export interface LastPourAnimation {
  readonly tubeIndex: number;
  readonly count: number;
}
