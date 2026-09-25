import type { TitleCard } from '../levels/types';

export type HudOptions = {
    title: string;
    maxHealth: number;
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
    private onStart: (() => void) | null = null;
    private toastTimer = 0;

    private readonly options: HudOptions;

    constructor(options: HudOptions, onRestart: () => void) {
        this.options = options;
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML = `<section class="health"><div class="eyebrow"></div><div id="hearts"></div></section><div id="toast"></div><div id="overlay" hidden><div class="end-card"><span class="end-icon">☀️</span><h1 id="end-title"></h1><p id="end-copy"></p><button id="restart">Spela igen <span>↗</span></button></div></div><div id="title" hidden><div class="title-card"><span class="title-icon">☀️</span><div class="title-eyebrow"></div><h1 class="title-name"></h1><p class="title-copy"></p><button id="start"><span class="start-label"></span> <span>↗</span></button><p class="title-hint"><span class="hint-keys"></span><span class="hint-touch"></span></p></div></div><output id="diagnostics" aria-hidden="true"></output>`;
        const find = (selector: string) => hud.querySelector<HTMLElement>(selector)!;
        find('.eyebrow').textContent = options.title;
        this.hearts = find('#hearts');
        this.toastEl = find('#toast');
        this.overlay = find('#overlay');
        this.endTitle = find('#end-title');
        this.endCopy = find('#end-copy');
        this.diagnostics = find('#diagnostics');
        find('#restart').onclick = onRestart;
        this.title = find('#title');
        find('#start').onclick = () => this.onStart?.();
        this.title.addEventListener('transitionend', this.onTitleFaded);
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
        this.overlay.hidden = false;
        this.endTitle.textContent = title;
        this.endCopy.textContent = copy;
    }

    hideEnd() {
        this.overlay.hidden = true;
    }

    /** Shows the title splash; `onStart` runs when its button is pressed. */
    showTitle(card: TitleCard, onStart: () => void) {
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
        this.onStart = null;
        if (!this.title.hidden) this.title.classList.add('leaving');
    }

    setDiagnostics(text: string) {
        this.diagnostics.textContent = text;
    }

    destroy() {
        this.title.removeEventListener('transitionend', this.onTitleFaded);
        this.root.remove();
    }

    private onTitleFaded = (e: Event) => {
        if (e.target === this.title && this.title.classList.contains('leaving')) this.title.hidden = true;
    };
}
