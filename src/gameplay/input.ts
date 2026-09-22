const CAPTURED = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export type InputHandlers = {
    /** Called after the key has been recorded as held. */
    keydown(code: string): void;
    /** Window lost focus; held keys have already been released. */
    blur(): void;
    pointerdown(): void;
};

/** Keyboard and pointer state for one scene, attached to the window and canvas. */
export class Input {
    private readonly keys = new Set<string>();

    private readonly canvas: HTMLCanvasElement;

    private readonly handlers: InputHandlers;

    constructor(canvas: HTMLCanvasElement, handlers: InputHandlers) {
        this.canvas = canvas;

        this.handlers = handlers;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
        canvas.addEventListener('pointerdown', this.onPointerDown);
    }

    isDown(code: string) {
        return this.keys.has(code);
    }

    /** WASD / arrow direction on the ground plane, each component -1, 0 or 1 (+Z is toward the camera). */
    axis() {
        const k = this.keys;
        return {
            x: Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft')),
            z: Number(k.has('KeyS') || k.has('ArrowDown')) - Number(k.has('KeyW') || k.has('ArrowUp'))
        };
    }

    clear() {
        this.keys.clear();
    }

    destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.keys.clear();
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (CAPTURED.includes(e.code)) e.preventDefault();
        this.keys.add(e.code);
        this.handlers.keydown(e.code);
    };

    private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

    private onBlur = () => {
        this.keys.clear();
        this.handlers.blur();
    };

    private onPointerDown = () => this.handlers.pointerdown();
}
