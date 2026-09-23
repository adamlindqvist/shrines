const CAPTURED = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export type InputHandlers = {
    /** Called after the key has been recorded as held. */
    keydown(code: string): void;
    /** Window lost focus; held keys have already been released. */
    blur(): void;
    pointerdown(): void;
};

/** Analog direction source such as an on-screen joystick, released whenever held input is cleared. */
export type AxisSource = {
    axis(): { x: number; z: number };
    release(): void;
    destroy(): void;
};

/** Keyboard and pointer state for one scene, attached to the window and canvas. */
export class Input {
    private readonly keys = new Set<string>();

    private readonly canvas: HTMLCanvasElement;

    private readonly handlers: InputHandlers;

    private readonly touch?: AxisSource;

    constructor(canvas: HTMLCanvasElement, handlers: InputHandlers, touch?: AxisSource) {
        this.canvas = canvas;

        this.handlers = handlers;
        this.touch = touch;
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);
        canvas.addEventListener('pointerdown', this.onPointerDown);
    }

    isDown(code: string) {
        return this.keys.has(code);
    }

    /**
     * Direction on the ground plane (+Z is toward the camera): WASD / arrows with each component -1, 0 or 1,
     * otherwise the touch stick.
     */
    axis() {
        const k = this.keys;
        const x = Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft')),
            z = Number(k.has('KeyS') || k.has('ArrowDown')) - Number(k.has('KeyW') || k.has('ArrowUp'));
        if (x || z || !this.touch) return { x, z };
        return this.touch.axis();
    }

    clear() {
        this.keys.clear();
        this.touch?.release();
    }

    destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.keys.clear();
        this.touch?.destroy();
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (CAPTURED.includes(e.code)) e.preventDefault();
        if (e.repeat || this.keys.has(e.code)) return;
        this.keys.add(e.code);
        this.handlers.keydown(e.code);
    };

    private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

    private onBlur = () => {
        this.clear();
        this.handlers.blur();
    };

    private onPointerDown = () => this.handlers.pointerdown();
}
