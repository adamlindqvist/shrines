/** Level checkpoints only: puzzles, hearts and positions start fresh on reload. */
export type JourneyProgress = {
    version: 1;
    furthestLevelId: string;
    completedLevelIds: string[];
};

export const PROGRESS_KEY = 'shrines.progress.v1';

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Owns monotonic adventure progress, with an in-memory fallback if storage is unavailable. */
export class ProgressStore {
    private progress: JourneyProgress;
    private readonly levels: readonly string[];
    private readonly storage: () => ProgressStorage;

    constructor(levels: readonly string[], storage: () => ProgressStorage = () => window.localStorage) {
        this.levels = levels;
        this.storage = storage;
        this.progress = { version: 1, furthestLevelId: levels[0], completedLevelIds: [] };
        try {
            const saved: unknown = JSON.parse(this.storage().getItem(PROGRESS_KEY) ?? 'null');
            if (!saved || typeof saved !== 'object') return;
            const data = saved as Partial<JourneyProgress>;
            // Twin Bridges Isle was removed; resume its successor without losing saved progress.
            const checkpoint = data.furthestLevelId === 'twin-bridges' ? 'sun-gate' : data.furthestLevelId;
            if (data.version !== 1 || !levels.includes(checkpoint ?? '')) return;
            const completedThrough = levels.indexOf(checkpoint!);
            let furthest = completedThrough;
            const completed = Array.isArray(data.completedLevelIds) ? data.completedLevelIds : [];
            // A completed former finale unlocks the newly appended sixth area.
            if (
                checkpoint === 'lantern-lake' &&
                completed.includes('lantern-lake') &&
                levels[furthest + 1] === 'returning-glade'
            )
                furthest++;
            this.progress = {
                version: 1,
                furthestLevelId: levels[furthest],
                completedLevelIds: levels.filter((id, index) => index <= completedThrough && completed.includes(id))
            };
        } catch {
            // A corrupt save or denied storage must never prevent play.
        }
    }

    get checkpoint(): string {
        return this.progress.furthestLevelId;
    }

    isUnlocked(id: string): boolean {
        const index = this.levels.indexOf(id);
        return index >= 0 && index <= this.levels.indexOf(this.checkpoint);
    }

    isCompleted(id: string): boolean {
        return this.progress.completedLevelIds.includes(id);
    }

    /** Completing an unlocked level records its reward and unlocks the next area immediately. */
    complete(id: string) {
        if (!this.isUnlocked(id)) return;
        const nextIndex = Math.min(this.levels.indexOf(id) + 1, this.levels.length - 1);
        const furthestIndex = Math.max(nextIndex, this.levels.indexOf(this.checkpoint));
        const completed = new Set([...this.progress.completedLevelIds, id]);
        this.progress = {
            version: 1,
            furthestLevelId: this.levels[furthestIndex],
            completedLevelIds: this.levels.filter((level) => completed.has(level))
        };
        try {
            this.storage().setItem(PROGRESS_KEY, JSON.stringify(this.progress));
        } catch {
            // The current session still retains unlocks if saving is denied or storage is full.
        }
    }
}
