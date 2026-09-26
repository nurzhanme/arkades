import { TubesGame } from '../engine/TubesGame';
import { StorageService } from '../services/StorageService';
import { COLOR_PALETTE, TUBE_CAPACITY } from '../constants';
import { Difficulty } from '../types';

export class TubesUI {
  private readonly game: TubesGame;
  private readonly boardEl: HTMLElement;
  private readonly movesEl: HTMLElement;
  private readonly solvedEl: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly restartBtn: HTMLButtonElement;
  private readonly newBtn: HTMLButtonElement;
  private readonly diffBtns: NodeListOf<HTMLButtonElement>;

  constructor() {
    this.game = new TubesGame();
    this.boardEl = this.requireElement<HTMLElement>('#board');
    this.movesEl = this.requireElement<HTMLElement>('#moves');
    this.solvedEl = this.requireElement<HTMLElement>('#solved');
    this.undoBtn = this.requireElement<HTMLButtonElement>('#undo');
    this.restartBtn = this.requireElement<HTMLButtonElement>('#restart');
    this.newBtn = this.requireElement<HTMLButtonElement>('#new');
    this.diffBtns = document.querySelectorAll<HTMLButtonElement>('[data-diff]');
  }

  public init(): void {
    const saved = StorageService.load();
    this.game.setDifficulty(saved.diff);
    this.game.setSolvedCount(saved.solvedCount);

    this.bindEvents();
    this.syncDifficultyButtons();
    this.startNewLevel();
  }

  private bindEvents(): void {
    this.newBtn.addEventListener('click', () => this.startNewLevel());
    this.restartBtn.addEventListener('click', () => this.restartLevel());
    this.undoBtn.addEventListener('click', () => this.undoMove());

    this.diffBtns.forEach(button => {
      button.addEventListener('click', () => {
        const diff = button.dataset.diff as Difficulty;
        if (diff && this.game.setDifficulty(diff)) {
          this.saveSettings();
          this.syncDifficultyButtons();
          this.startNewLevel();
        }
      });
    });
  }

  private startNewLevel(): void {
    const success = this.game.startNewGame();
    if (!success) {
      alert('Не удалось собрать уровень, попробуй ещё раз');
      return;
    }
    this.render();
  }

  private restartLevel(): void {
    this.game.restartCurrentLevel();
    this.render();
  }

  private undoMove(): void {
    if (this.game.undoMove()) {
      this.render();
    }
  }

  private onTubeInteraction(index: number, element: HTMLElement): void {
    const wasWon = this.game.isWon;
    if (wasWon) return;

    const hadSelection = this.game.selectedIndex !== null;
    const isDifferentTarget = hadSelection && this.game.selectedIndex !== index;

    const validAction = this.game.selectTube(index);

    if (isDifferentTarget && !validAction) {
      element.classList.remove('nope');
      void element.offsetWidth; // Trigger reflow for animation restart
      element.classList.add('nope');
      setTimeout(() => this.render(), 320);
      return;
    }

    if (this.game.isWon) {
      this.saveSettings();
    }

    this.render();
  }

  private render(): void {
    this.boardEl.innerHTML = '';
    const tubes = this.game.tubes;
    const selectedIndex = this.game.selectedIndex;
    const lastPour = this.game.lastPour;

    tubes.forEach((tube, index) => {
      const tubeEl = document.createElement('div');
      tubeEl.className = 'tube';
      tubeEl.tabIndex = 0;
      tubeEl.setAttribute('role', 'button');
      tubeEl.setAttribute(
        'aria-label',
        `Пробирка ${index + 1}, заполнена на ${tube.length} из ${tube.capacity}`
      );

      if (selectedIndex === index) {
        tubeEl.classList.add('selected');
      }

      if (tube.isComplete && !tube.isEmpty) {
        tubeEl.classList.add('done');
      }

      for (let slot = 0; slot < TUBE_CAPACITY; slot++) {
        const segEl = document.createElement('div');
        if (slot < tube.length) {
          const isTop = slot === tube.length - 1;
          segEl.className = 'seg' + (isTop ? ' top' : '');
          const colorCode = tube.getColorAt(slot);
          if (colorCode !== undefined) {
            segEl.style.setProperty('--c', COLOR_PALETTE[colorCode]);
          }

          if (
            lastPour &&
            lastPour.tubeIndex === index &&
            slot >= tube.length - lastPour.count
          ) {
            segEl.classList.add('pour');
          }
        } else {
          segEl.className = 'slot';
        }
        tubeEl.appendChild(segEl);
      }

      tubeEl.addEventListener('click', () => this.onTubeInteraction(index, tubeEl));
      tubeEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onTubeInteraction(index, tubeEl);
        }
      });

      this.boardEl.appendChild(tubeEl);
    });

    this.game.clearLastPour();
    this.movesEl.textContent = String(this.game.moves);
    this.solvedEl.textContent = String(this.game.solvedCount);
    this.undoBtn.disabled = !this.game.canUndo;

    if (this.game.isWon) {
      this.showWinModal();
    }
  }

  private showWinModal(): void {
    const modal = document.createElement('div');
    modal.className = 'win';

    const title = document.createElement('p');
    title.textContent = 'Уровень пройден';

    const score = document.createElement('span');
    score.textContent = `Ходов: ${this.game.moves}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'primary';
    nextBtn.textContent = 'Следующий уровень';
    nextBtn.addEventListener('click', () => this.startNewLevel());

    modal.appendChild(title);
    modal.appendChild(score);
    modal.appendChild(nextBtn);
    this.boardEl.appendChild(modal);

    nextBtn.focus();
  }

  private syncDifficultyButtons(): void {
    const currentDiff = this.game.difficulty;
    this.diffBtns.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.diff === currentDiff));
    });
  }

  private saveSettings(): void {
    StorageService.save({
      diff: this.game.difficulty,
      solvedCount: this.game.solvedCount
    });
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const el = document.querySelector<T>(selector);
    if (!el) {
      throw new Error(`Required DOM element not found: ${selector}`);
    }
    return el;
  }
}
