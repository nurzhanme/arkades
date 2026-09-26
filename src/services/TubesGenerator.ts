import { Tube } from '../models/Tube';
import { Difficulty, DifficultyConfig } from '../types';
import { DIFFICULTY_SETTINGS, TUBE_CAPACITY } from '../constants';

export class TubesGenerator {
  public static generate(difficulty: Difficulty): Tube[] | null {
    const config: DifficultyConfig = DIFFICULTY_SETTINGS[difficulty];
    for (let attempt = 0; attempt < 300; attempt++) {
      const pool: number[] = [];
      for (let color = 0; color < config.colors; color++) {
        for (let i = 0; i < TUBE_CAPACITY; i++) {
          pool.push(color);
        }
      }
      this.shuffle(pool);

      const rawTubes: number[][] = [];
      for (let i = 0; i < config.colors; i++) {
        rawTubes.push(pool.slice(i * TUBE_CAPACITY, (i + 1) * TUBE_CAPACITY));
      }

      // Avoid already complete tubes at start
      if (rawTubes.some(t => t.every(c => c === t[0]))) {
        continue;
      }

      for (let i = 0; i < config.empty; i++) {
        rawTubes.push([]);
      }

      if (this.isSolvable(rawTubes)) {
        return rawTubes.map(items => new Tube(items));
      }
    }
    return null;
  }

  public static isSolvable(initialState: number[][]): boolean {
    const serialize = (state: number[][]): string =>
      state.map(t => t.join(',')).sort().join('|');

    const seen = new Set<string>([serialize(initialState)]);
    const stack: number[][][] = [initialState.map(t => t.slice())];
    let evaluatedNodes = 0;

    while (stack.length > 0) {
      if (++evaluatedNodes > 120000) return false;
      const current = stack.pop()!;
      if (this.isStateSolved(current)) return true;

      const nextMoves: [priority: number, state: number[][]][] = [];

      for (let i = 0; i < current.length; i++) {
        const from = current[i];
        if (from.length === 0) continue;

        const color = from[from.length - 1];
        let run = 1;
        for (let k = from.length - 2; k >= 0 && from[k] === color; k--) run++;
        if (run === from.length && (from.length === TUBE_CAPACITY || from.length === 0)) {
          continue; // Already complete
        }

        for (let j = 0; j < current.length; j++) {
          if (i === j) continue;
          const to = current[j];
          if (to.length >= TUBE_CAPACITY) continue;
          if (to.length > 0 && to[to.length - 1] !== color) continue;
          if (to.length === 0 && run === from.length) continue; // Meaningless move

          const nextState = current.map(t => t.slice());
          const pourCount = Math.min(run, TUBE_CAPACITY - nextState[j].length);
          for (let x = 0; x < pourCount; x++) {
            const popped = nextState[i].pop();
            if (popped !== undefined) nextState[j].push(popped);
          }

          const stateKey = serialize(nextState);
          if (seen.has(stateKey)) continue;
          seen.add(stateKey);

          const priority = nextState[j].length === TUBE_CAPACITY ? 2 : (to.length > 0 ? 1 : 0);
          nextMoves.push([priority, nextState]);
        }
      }

      nextMoves.sort((a, b) => a[0] - b[0]);
      for (const [, state] of nextMoves) {
        stack.push(state);
      }
    }
    return false;
  }

  private static isStateSolved(state: number[][]): boolean {
    return state.every(t => t.length === 0 || (t.length === TUBE_CAPACITY && t.every(c => c === t[0])));
  }

  private static shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }
}
