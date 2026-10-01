import type { TitleCard } from '../levels/types';

export type HudOptions = {
    title: string;
    maxHealth: number;
};

export type LevelChoice = {
    id: string;
    name: string;
    unlocked: boolean;
    completed: boolean;
    current: boolean;
    checkpoint: boolean;
};

/** DOM overlay: hearts, controls, toast, title splash, end card and a hidden diagnostics readout. */
export class Hud {
    readonly root: HTMLDivElement;
    private readonly hearts: HTMLElement;
    private readonly toastEl: HTMLElement;
    private readonly overlay: HTMLElement;
    private readonly endTitle: HTMLElement;
    private readonly endCopy: HTMLElement;
    private readonly diagnostics: HTMLElement;
    private readonly title: HTMLElement;
    private readonly levelMenu: HTMLDialogElement;
    private readonly levelsButton: HTMLElement;
    private readonly hasLevels: boolean;
    private onStart: (() => void) | null = null;
    private toastTimer = 0;

    private readonly options: HudOptions;

    constructor(options: HudOptions, onRestart: () => void, onLevels?: () => void) {
        this.options = options;
        this.hasLevels = !!onLevels;
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.classList.toggle('has-levels', !!onLevels);
        hud.innerHTML = `<section class="health"><div class="eyebrow"></div><div id="hearts"></div></section><button id="levels-button" class="levels-button" hidden>Områden</button><div id="toast"></div><div id="overlay" hidden><div class="end-card"><span class="end-icon">☀️</span><h1 id="end-title"></h1><p id="end-copy"></p><button id="restart">Spela igen <span>↗</span></button><button id="end-levels" class="secondary-button" hidden>Välj område</button></div></div><div id="title" hidden><div class="title-card"><span class="title-icon">☀️</span><div class="title-eyebrow"></div><h1 class="title-name"></h1><p class="title-copy"></p><button id="start"><span class="start-label"></span> <span>↗</span></button><button id="title-levels" class="secondary-button" hidden>Välj område</button><p class="title-hint"><span class="hint-keys"></span><span class="hint-touch"></span></p></div></div><dialog id="level-menu" aria-labelledby="level-menu-title" aria-describedby="level-menu-copy"><div class="level-menu-heading"><h2 id="level-menu-title">Dina områden</h2><button id="close-levels" aria-label="Stäng områdesväljaren" autofocus>✕</button></div><p id="level-menu-copy">Besök en gammal favorit eller fortsätt framåt. Området börjar om när du väljer det.</p><div id="level-list"></div><p class="level-menu-note">Ditt längst nådda område sparas i den här webbläsaren.</p></dialog><output id="diagnostics" aria-hidden="true"></output>`;
        const find = (selector: string) => hud.querySelector<HTMLElement>(selector)!;
        find('.eyebrow').textContent = options.title;
        this.hearts = find('#hearts');
        this.toastEl = find('#toast');
        this.overlay = find('#overlay');
        this.endTitle = find('#end-title');
        this.endCopy = find('#end-copy');
        this.diagnostics = find('#diagnostics');
        find('#restart').onclick = onRestart;
        for (const selector of ['#levels-button', '#title-levels', '#end-levels']) {
            const button = find(selector);
            button.hidden = !onLevels;
            button.onclick = () => onLevels?.();
        }
        this.levelMenu = find('#level-menu') as HTMLDialogElement;
        this.levelsButton = find('#levels-button');
        this.title = find('#title');
        find('#start').onclick = () => this.onStart?.();
        this.title.addEventListener('transitionend', this.onTitleFaded);
        hud.addEventListener('keydown', this.onButtonKeyDown);
        this.root = hud;
        this.setHealth(options.maxHealth);
        document.body.appendChild(hud);
    }

    setHealth(health: number) {
        this.hearts.textContent = Array.from({ length: this.options.maxHealth }, (_, n) =>
            n < health ? '❤️' : '🤍'
        ).join(' ');
    }

    /** Shows a toast that fades after 2.6 seconds of play. */
    announce(text: string) {
        this.toastEl.textContent = text;
        this.toastEl.classList.add('visible');
        this.toastTimer = 2.6;
    }

    /** Shows a toast that stays until hidden. */
    notify(text: string) {
        this.toastEl.textContent = text;
        this.toastEl.classList.add('visible');
    }

    hideToast() {
        this.toastEl.classList.remove('visible');
    }

    /** Counts down the announcement timer; call only while play is running. */
    tick(dt: number) {
        this.toastTimer -= dt;
        if (this.toastTimer < 0) this.hideToast();
    }

    showEnd(title: string, copy: string) {
        this.levelsButton.hidden = true;
        this.overlay.hidden = false;
        this.endTitle.textContent = title;
        this.endCopy.textContent = copy;
    }

    hideEnd() {
        this.overlay.hidden = true;
        this.levelsButton.hidden = !this.hasLevels;
    }

    /** Shows the title splash; `onStart` runs when its button is pressed. */
    showTitle(card: TitleCard, onStart: () => void) {
        this.levelsButton.hidden = true;
        const find = (selector: string) => this.title.querySelector<HTMLElement>(selector)!;
        find('.title-eyebrow').textContent = card.eyebrow;
        find('.title-name').textContent = card.title;
        find('.title-copy').textContent = card.copy;
        find('.start-label').textContent = card.start;
        find('.hint-keys').textContent = card.hint;
        find('.hint-touch').textContent = card.touchHint;
        this.onStart = onStart;
        this.title.classList.remove('leaving');
        this.title.hidden = false;
    }

    /** Fades the title splash out; it stops taking input immediately. */
    hideTitle() {
        this.levelsButton.hidden = !this.hasLevels;
        this.onStart = null;
        if (!this.title.hidden) this.title.classList.add('leaving');
    }

    /** Native modal supplies keyboard focus containment and blocks the canvas and touch controls. */
    showLevels(levels: LevelChoice[], onSelect: (id: string) => void, onClose: () => void) {
        const list = this.levelMenu.querySelector<HTMLElement>('#level-list')!;
        list.replaceChildren();
        levels.forEach((level, index) => {
            const button = document.createElement('button');
            button.className = 'level-choice';
            button.disabled = !level.unlocked;
            if (level.current) button.setAttribute('aria-current', 'true');
            const name = document.createElement('span');
            name.className = 'level-name';
            name.textContent = `${index + 1} · ${level.name}`;
            const status = document.createElement('span');
            status.className = 'level-status';
            status.textContent = !level.unlocked
                ? 'Låst'
                : level.completed
                  ? '✓ Avklarad · Spela igen'
                  : 'Redo att utforska';
            if (level.checkpoint) status.textContent += ' · Fortsätt här';
            if (level.current) status.textContent += ' · Här är du';
            button.append(name, status);
            button.onclick = () => onSelect(level.id);
            list.appendChild(button);
        });
        this.levelMenu.querySelector<HTMLElement>('#close-levels')!.onclick = onClose;
        this.levelMenu.oncancel = (event) => {
            event.preventDefault();
            onClose();
        };
        this.levelMenu.showModal();
    }

    hideLevels() {
        if (this.levelMenu.open) this.levelMenu.close();
    }

    setDiagnostics(text: string) {
        this.diagnostics.textContent = text;
    }

    destroy() {
        this.hideLevels();
        this.title.removeEventListener('transitionend', this.onTitleFaded);
        this.root.removeEventListener('keydown', this.onButtonKeyDown);
        this.root.remove();
    }

    /** Activate once on Enter and suppress the browser's default duplicate activation. */
    private onButtonKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter') return;
        const button = (event.target as HTMLElement | null)?.closest?.<HTMLButtonElement>('button');
        if (!button) return;
        event.preventDefault();
        if (!event.repeat && !button.disabled) button.click();
    };

    private onTitleFaded = (e: Event) => {
        if (e.target === this.title && this.title.classList.contains('leaving')) this.title.hidden = true;
    };
}
