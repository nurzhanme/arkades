import { Tube } from '../models/Tube';
import { Difficulty, GameSnapshot, LastPourAnimation } from '../types';
import { TubesGenerator } from '../services/TubesGenerator';

export class TubesGame {
  private _difficulty: Difficulty = 'easy';
  private _tubes: Tube[] = [];
  private _initialTubes: Tube[] = [];
  private _history: GameSnapshot[] = [];
  private _selectedIndex: number | null = null;
  private _moves: number = 0;
  private _solvedCount: number = 0;
  private _lastPour: LastPourAnimation | null = null;
  private _isWon: boolean = false;

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  get tubes(): readonly Tube[] {
    return this._tubes;
  }

  get selectedIndex(): number | null {
    return this._selectedIndex;
  }

  get moves(): number {
    return this._moves;
  }

  get solvedCount(): number {
    return this._solvedCount;
  }

  get lastPour(): LastPourAnimation | null {
    return this._lastPour;
  }

  get isWon(): boolean {
    return this._isWon;
  }

  get canUndo(): boolean {
    return this._history.length > 0 && !this._isWon;
  }

  setDifficulty(diff: Difficulty): boolean {
    if (this._difficulty === diff) return false;
    this._difficulty = diff;
    return true;
  }

  setSolvedCount(count: number): void {
    this._solvedCount = count;
  }

  clearLastPour(): void {
    this._lastPour = null;
  }

  startNewGame(): boolean {
    const generated = TubesGenerator.generate(this._difficulty);
    if (!generated) return false;

    this._tubes = generated;
    this._initialTubes = generated.map(t => t.clone());
    this._history = [];
    this._moves = 0;
    this._selectedIndex = null;
    this._isWon = false;
    this._lastPour = null;
    return true;
  }

  restartCurrentLevel(): void {
    this._tubes = this._initialTubes.map(t => t.clone());
    this._history = [];
    this._moves = 0;
    this._selectedIndex = null;
    this._isWon = false;
    this._lastPour = null;
  }

  undoMove(): boolean {
    const last = this._history.pop();
    if (!last) return false;

    this._tubes = last.state.map(items => new Tube(items));
    this._moves = last.moves;
    this._selectedIndex = null;
    this._isWon = false;
    this._lastPour = null;
    return true;
  }

  selectTube(index: number): boolean {
    if (this._isWon) return false;
    const tube = this._tubes[index];
    if (!tube) return false;

    if (this._selectedIndex === null) {
      if (!tube.isEmpty) {
        this._selectedIndex = index;
        return true;
      }
      return false;
    }

    if (this._selectedIndex === index) {
      this._selectedIndex = null;
      return true;
    }

    const sourceTube = this._tubes[this._selectedIndex];
    if (sourceTube.canPourInto(tube)) {
      this.pushHistory();
      const pouredCount = sourceTube.pourInto(tube);
      this._lastPour = { tubeIndex: index, count: pouredCount };
      this._moves++;
      this._selectedIndex = null;
      this._isWon = this.checkWinCondition();
      if (this._isWon) {
        this._solvedCount++;
      }
      return true;
    }

    // Invalid pour target: change selection to clicked tube if it has liquid, otherwise clear
    this._selectedIndex = tube.isEmpty ? null : index;
    return false;
  }

  private pushHistory(): void {
    this._history.push({
      state: this._tubes.map(t => t.toArray()),
      moves: this._moves
    });
    if (this._history.length > 300) {
      this._history.shift();
    }
  }

  private checkWinCondition(): boolean {
    return this._tubes.every(t => t.isComplete);
  }
}
