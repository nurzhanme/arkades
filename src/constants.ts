import { Difficulty, DifficultyConfig } from './types';

export const TUBE_CAPACITY = 4;

export const COLOR_PALETTE: readonly string[] = [
  '#e8453c',
  '#f5a524',
  '#2f9be0',
  '#46c46f',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#a3621f',
  '#64748b'
];

export const DIFFICULTY_SETTINGS: Readonly<Record<Difficulty, DifficultyConfig>> = {
  easy: { colors: 4, empty: 2 },
  medium: { colors: 6, empty: 2 },
  hard: { colors: 9, empty: 2 }
};

export const STORAGE_KEY = 'tubes';
