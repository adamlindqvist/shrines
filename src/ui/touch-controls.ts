export const TOUCH = {
    /** Fraction of the stick radius the knob can travel. */
    travel: 0.55,
    /** Fraction of the knob travel ignored as no input. */
    deadZone: 0.25
};

export type TouchHandlers = {
    /** A control was touched; used to resume play. */
    press(): void;
    attack(): void;
};

/** On-screen joystick (bottom-left) and attack button (bottom-right), revealed on touch devices. */
export class TouchControls {
    private readonly parent: HTMLElement;
    private readonly stick: HTMLElement;
    private readonly knob: HTMLElement;
    private readonly button: HTMLElement;
    private readonly handlers: TouchHandlers;
    private pointer: number | null = null;
    private centerX = 0;
    private centerY = 0;
    private reach = 1;
    private x = 0;
    private z = 0;

    constructor(parent: HTMLElement, handlers: TouchHandlers) {
        this.parent = parent;
        this.handlers = handlers;
        this.stick = document.createElement('div');
        this.stick.className = 'touch-stick';
        this.knob = document.createElement('div');
        this.knob.className = 'touch-knob';
        this.stick.appendChild(this.knob);
        this.button = document.createElement('button');
        this.button.className = 'touch-attack';
        this.button.setAttribute('aria-label', 'Attackera');
        this.button.textContent = '⚔️';
        const overlay = parent.querySelector('#overlay');
        parent.insertBefore(this.stick, overlay);
        parent.insertBefore(this.button, overlay);

        this.stick.addEventListener('pointerdown', this.onStickDown);
        this.stick.addEventListener('pointermove', this.onStickMove);
        this.stick.addEventListener('pointerup', this.onStickUp);
        this.stick.addEventListener('pointercancel', this.onStickUp);
        this.stick.addEventListener('lostpointercapture', this.onStickUp);
        this.button.addEventListener('pointerdown', this.onAttack);
        window.addEventListener('pointerdown', this.onAnyPointer);
        if (window.matchMedia?.('(pointer: coarse)').matches) this.reveal();
    }

    /** Stick direction on the ground plane with length up to 1; +Z is toward the camera (screen down). */
    axis() {
        return { x: this.x, z: this.z };
    }

    /** Lets go of the stick and recentres the knob. */
    release() {
        if (this.pointer !== null && this.stick.hasPointerCapture?.(this.pointer)) {
            this.stick.releasePointerCapture(this.pointer);
        }
        this.pointer = null;
        this.x = 0;
        this.z = 0;
        this.knob.style.transform = '';
    }

    destroy() {
        this.release();
        this.stick.removeEventListener('pointerdown', this.onStickDown);
        this.stick.removeEventListener('pointermove', this.onStickMove);
        this.stick.removeEventListener('pointerup', this.onStickUp);
        this.stick.removeEventListener('pointercancel', this.onStickUp);
        this.stick.removeEventListener('lostpointercapture', this.onStickUp);
        this.button.removeEventListener('pointerdown', this.onAttack);
        window.removeEventListener('pointerdown', this.onAnyPointer);
        this.stick.remove();
        this.button.remove();
    }

    private reveal() {
        this.parent.classList.add('touch');
    }

    private steer(clientX: number, clientY: number) {
        let dx = (clientX - this.centerX) / this.reach,
            dy = (clientY - this.centerY) / this.reach;
        const length = Math.hypot(dx, dy);
        if (length > 1) {
            dx /= length;
            dy /= length;
        }
        this.knob.style.transform = `translate(${dx * this.reach}px, ${dy * this.reach}px)`;
        const active = length > TOUCH.deadZone;
        this.x = active ? dx : 0;
        this.z = active ? dy : 0;
    }

    private onStickDown = (e: PointerEvent) => {
        e.preventDefault();
        if (this.pointer !== null) return;
        this.pointer = e.pointerId;
        try {
            this.stick.setPointerCapture?.(e.pointerId);
        } catch {
            // Capture fails for pointers the browser no longer tracks; moves over the stick still steer.
        }
        const rect = this.stick.getBoundingClientRect();
        this.centerX = rect.left + rect.width / 2;
        this.centerY = rect.top + rect.height / 2;
        this.reach = (rect.width / 2) * TOUCH.travel || 1;
        this.handlers.press();
        this.steer(e.clientX, e.clientY);
    };

    private onStickMove = (e: PointerEvent) => {
        if (e.pointerId === this.pointer) this.steer(e.clientX, e.clientY);
    };

    private onStickUp = (e: PointerEvent) => {
        if (e.pointerId === this.pointer) this.release();
    };

    private onAttack = (e: PointerEvent) => {
        e.preventDefault();
        this.handlers.attack();
    };

    private onAnyPointer = (e: PointerEvent) => {
        if (e.pointerType === 'touch') this.reveal();
    };
}
