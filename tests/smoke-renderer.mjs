/** Keep real trail sampling/lifetimes while replacing only its GPU allocation. */
export function stubSmokeRenderer(t, MovementTrail, capacity = 20) {
    t.mock.method(MovementTrail.prototype, 'createPuff', function () {
        if (this.pool.length >= capacity) return;
        const noop = () => undefined;
        const puff = {
            remaining: 0,
            entity: {
                enabled: false,
                position: null,
                setPosition(x, y, z) {
                    this.position = { x, y, z };
                },
                destroy: noop,
                particlesystem: {
                    reset: noop,
                    pause: noop,
                    emitter: { material: { depthTest: true }, meshInstance: {}, addTime: noop, finishFrame: noop }
                }
            }
        };
        this.pool.push(puff);
        return puff;
    });
}
