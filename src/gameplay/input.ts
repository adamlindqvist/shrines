const CAPTURED = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];

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
    guarding?(): boolean;
    release(): void;
    destroy(): void;
};

/** Keyboard and pointer state for one scene, attached to the window and canvas. */
export class Input {
    private readonly keys = new Set<string>();

    private shieldPointer: number | null = null;
    private mouseGuard = false;

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
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
        canvas.addEventListener('lostpointercapture', this.onPointerUp);
        canvas.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        canvas.addEventListener('contextmenu', this.onContextMenu);
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

    guarding() {
        return (
            this.isDown('ShiftLeft') ||
            this.isDown('ShiftRight') ||
            this.shieldPointer !== null ||
            this.mouseGuard ||
            !!this.touch?.guarding?.()
        );
    }

    clear() {
        this.mouseGuard = false;
        const pointer = this.shieldPointer;
        this.shieldPointer = null;
        if (pointer !== null && this.canvas.hasPointerCapture?.(pointer)) this.canvas.releasePointerCapture(pointer);
        this.keys.clear();
        this.touch?.release();
    }

    destroy() {
        this.clear();
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
        this.canvas.removeEventListener('lostpointercapture', this.onPointerUp);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('contextmenu', this.onContextMenu);
        this.keys.clear();
        this.touch?.destroy();
    }

    private onKeyDown = (e: KeyboardEvent) => {
        // Let native buttons and the level dialog own their keyboard interactions.
        if (e.code === 'Tab' || (e.target as HTMLElement | null)?.closest?.('button, dialog')) return;
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

    private onPointerDown = (e: PointerEvent) => {
        e.preventDefault();
        if (e.pointerType === 'touch') return;
        if (e.button === 2) {
            this.shieldPointer = e.pointerId;
            try {
                this.canvas.setPointerCapture?.(e.pointerId);
            } catch {
                // Window pointer-up still releases guard if capture is unavailable.
            }
        } else if (e.button !== 0) return;
        this.handlers.pointerdown();
    };
    private onMouseDown = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();
        // A second held mouse button produces mousedown but no new pointerdown.
        this.mouseGuard = true;
        this.handlers.pointerdown();
    };

    private onMouseUp = (e: MouseEvent) => {
        if (e.button !== 2) return;
        this.mouseGuard = false;
        const pointer = this.shieldPointer;
        this.shieldPointer = null;
        if (pointer !== null && this.canvas.hasPointerCapture?.(pointer)) this.canvas.releasePointerCapture(pointer);
    };

    private onPointerUp = (e: PointerEvent) => {
        if (e.pointerId === this.shieldPointer) {
            this.mouseGuard = false;
            this.shieldPointer = null;
            if (this.canvas.hasPointerCapture?.(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
        }
    };

    private onContextMenu = (e: Event) => e.preventDefault();
}
