import { TUBE_CAPACITY } from '../constants';

export class Tube {
  private readonly items: number[];
  public readonly capacity: number;

  constructor(items: number[] = [], capacity: number = TUBE_CAPACITY) {
    this.items = [...items];
    this.capacity = capacity;
  }

  get length(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get isFull(): boolean {
    return this.items.length >= this.capacity;
  }

  get topColor(): number | null {
    if (this.isEmpty) return null;
    return this.items[this.items.length - 1];
  }

  get runLength(): number {
    if (this.isEmpty) return 0;
    const top = this.topColor;
    let count = 1;
    for (let i = this.items.length - 2; i >= 0 && this.items[i] === top; i--) {
      count++;
    }
    return count;
  }

  get isComplete(): boolean {
    if (this.isEmpty) return true;
    if (this.length !== this.capacity) return false;
    const first = this.items[0];
    return this.items.every(item => item === first);
  }

  canPourInto(target: Tube): boolean {
    if (this === target || this.isEmpty || target.isFull) {
      return false;
    }
    return target.isEmpty || target.topColor === this.topColor;
  }

  pourInto(target: Tube): number {
    if (!this.canPourInto(target)) {
      return 0;
    }
    const maxPour = Math.min(this.runLength, target.capacity - target.length);
    for (let i = 0; i < maxPour; i++) {
      const color = this.items.pop();
      if (color !== undefined) {
        target.items.push(color);
      }
    }
    return maxPour;
  }

  getColorAt(index: number): number | undefined {
    return this.items[index];
  }

  toArray(): number[] {
    return [...this.items];
  }

  clone(): Tube {
    return new Tube(this.items, this.capacity);
  }
}
