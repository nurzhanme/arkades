import { Difficulty, StorageData } from '../types';
import { DIFFICULTY_SETTINGS, STORAGE_KEY } from '../constants';

export class StorageService {
  public static load(): StorageData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StorageData>;
        const diff: Difficulty =
          parsed.diff && DIFFICULTY_SETTINGS[parsed.diff] ? parsed.diff : 'easy';
        const solvedCount: number =
          typeof parsed.solvedCount === 'number' ? parsed.solvedCount | 0 : 0;
        return { diff, solvedCount };
      }
    } catch {
      // Ignore localStorage errors (e.g. cookies disabled or privacy mode)
    }
    return { diff: 'easy', solvedCount: 0 };
  }

  public static save(data: StorageData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota / security errors
    }
  }
}
