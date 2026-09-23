import type { Entity } from 'playcanvas';

import type { AppContext } from '../app/context';
import type { AdventurerHandles } from '../objects/adventurer';
import type { ChestHandles, SunSwitchHandles } from '../objects/puzzle';
import type { SlimeHandles } from '../objects/slime';
import type { Palette } from '../rendering/palette';
import type { Random } from '../rendering/random';
import type { SceneLayout } from '../scenes/builder';
import type { CameraRig } from '../scenes/camera-rig';
import { Hud } from '../ui/hud';
import type { HudOptions } from '../ui/hud';

import { Collision } from './collision';
import type { Bounds } from './collision';
import { SWORD, Sword } from './combat';
import { Effects } from './effects';
import { Input } from './input';
import { PLAYER, PlayerController } from './player';
import { BlockPuzzle } from './puzzle';
import type { Point, PuzzleConfig } from './puzzle';
import { SLIME, SlimePack } from './slimes';
import type { Slime, SlimeTarget } from './slimes';

export type GameState = 'playing' | 'paused' | 'won' | 'over';

type Card = { title: string; copy: string };

export type AdventureConfig = {
    spawn: Point;
    /** Rectangle the player and slimes are kept inside. */
    walkBounds: Bounds;
    puzzle: PuzzleConfig;
    hud: HudOptions;
    text: {
        unlockedQuest: Card;
        unlocked: string;
        defeatedSlime: string;
        paused: string;
        won: Card;
        over: Card;
    };
    /** Prefix for console diagnostics. */
    logTag: string;
};

/** Entities the adventure animates, as returned by the scene builder. */
export type AdventureCast = {
    player: AdventurerHandles;
    slimes: SlimeHandles[];
    block: Entity;
    sunSwitch: SunSwitchHandles;
    chest: ChestHandles;
};

export type AdventureDeps = {
    context: AppContext;
    /** Parent for transient effects. */
    root: Entity;
    rand: Random;
    palette: Palette;
    layout: SceneLayout;
    rig: CameraRig;
    cast: AdventureCast;
    config: AdventureConfig;
};

export type AdventureDiagnostics = ReturnType<AdventureGame['diagnostics']>;

/**
 * The single place that decides update order and game state for the
 * adventure: input → movement → combat → slimes → puzzle → ambience → camera.
 */
export class AdventureGame {
    state: GameState = 'playing';
    health: number;
    time = 0;
    kills = 0;
    private invincible = 0;
    private fps = 60;
    private frameTime = 0;
    private frameCount = 0;

    private readonly input: Input;
    private readonly hud: Hud;
    private readonly effects: Effects;
    private readonly collision: Collision;
    private readonly player: PlayerController;
    private readonly sword = new Sword();
    private readonly slimes: SlimePack;
    private readonly puzzle: BlockPuzzle;
    private readonly slimeTarget: SlimeTarget;

    private readonly deps: AdventureDeps;

    constructor(deps: AdventureDeps) {
        this.deps = deps;
        const { context, root, rand, palette, layout, cast, config } = deps;
        this.health = config.hud.maxHealth;
        this.collision = new Collision(layout.obstacles, config.walkBounds);
        this.effects = new Effects(root, rand);
        this.player = new PlayerController(cast.player);
        this.slimes = new SlimePack(cast.slimes, this.collision);
        this.puzzle = new BlockPuzzle(config.puzzle, cast.block, cast.sunSwitch, cast.chest, this.collision, {
            idle: palette.gold,
            lit: palette.teal
        });
        this.slimeTarget = {
            entity: cast.player.entity,
            canBeHit: () => this.invincible === 0,
            hit: (ex, ez, d) => this.onPlayerHit(ex, ez, d)
        };
        this.hud = new Hud(config.hud, () => this.reset());
        this.input = new Input(context.canvas, {
            keydown: (code) => this.onKeyDown(code),
            blur: () => this.pause(),
            pointerdown: () => {
                this.unpause();
                this.attack();
            }
        });
    }

    update(rawDt: number) {
        this.frameTime += rawDt;
        this.frameCount++;
        if (this.frameTime > 0.6) {
            this.fps = this.frameCount / this.frameTime;
            this.frameTime = 0;
            this.frameCount = 0;
            this.hud.setDiagnostics(JSON.stringify(this.diagnostics()));
        }
        const dt = Math.min(rawDt, 0.035);
        if (this.state !== 'paused') this.effects.update(dt);
        if (this.state !== 'playing') return;
        this.time += dt;
        this.invincible = Math.max(0, this.invincible - dt);
        this.sword.tick(dt);
        this.hud.tick(dt);

        // Movement: steer, push the block, then slide around obstacles.
        const player = this.player;
        const stride = player.stride(dt, this.input.axis());
        const next = this.puzzle.constrain(stride, player.moveX, player.moveZ, dt);
        const solved = this.collision.resolve(next.x, next.z, PLAYER.radius);
        player.moveTo(solved.x, solved.z);
        player.animate(this.time, this.sword.swing, SWORD.swingTime, this.invincible);

        // Combat.
        const p = player.position;
        this.sword.applyHits(p.x, p.z, this.slimes.slimes, (slime) => this.onSlimeHit(slime));
        this.slimes.update(dt, this.time, this.slimeTarget);

        // Puzzle.
        const { clicked, reached } = this.puzzle.update(dt, player.position);
        const { text, puzzle } = this.deps.config;
        if (clicked) {
            this.hud.setQuest(text.unlockedQuest.title, text.unlockedQuest.copy);
            this.announce(text.unlocked);
            this.effects.burst(puzzle.switch.x, puzzle.switch.z, this.deps.palette.gold, 20);
        }
        if (reached) {
            this.effects.burst(puzzle.chest.x, puzzle.chest.z, this.deps.palette.gold, 28);
            this.showEnd('won');
        }

        this.deps.layout.animate(this.time);
        const pp = player.position;
        this.deps.rig.follow(pp.x, pp.z, dt);
    }

    diagnostics() {
        const { app, canvas } = this.deps.context;
        const player = this.player.position,
            block = this.puzzle.blockPosition,
            sw = this.deps.config.puzzle.switch,
            sun = this.deps.rig.sun.forward;
        return Object.freeze({
            state: this.state,
            health: this.health,
            elapsed: +this.time.toFixed(2),
            fps: Math.round(this.fps),
            player: { x: player.x, z: player.z },
            block: { x: block.x, z: block.z },
            switch: { x: sw.x, z: sw.z },
            unlocked: this.puzzle.unlocked,
            kills: this.kills,
            enemies: this.slimes.slimes.map((e) => ({ x: e.x, z: e.z, hp: e.hp, mode: e.mode })),
            attackCooldown: this.sword.cooldown,
            effects: this.effects.count,
            drawCalls: app.stats.drawCalls.total,
            backbuffer: { width: canvas.width, height: canvas.height },
            sun: { fx: +sun.x.toFixed(3), fy: +sun.y.toFixed(3), fz: +sun.z.toFixed(3) }
        });
    }

    pause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.input.clear();
            this.hud.notify(this.deps.config.text.paused);
        }
    }

    unpause() {
        if (this.state === 'paused') {
            this.state = 'playing';
            this.hud.hideToast();
        }
    }

    /** Puts every piece of play state back to the start without rebuilding the scene. */
    reset() {
        const { config, rig } = this.deps;
        this.health = config.hud.maxHealth;
        this.time = 0;
        this.invincible = 0;
        this.kills = 0;
        this.sword.reset();
        this.player.reset(config.spawn.x, config.spawn.z);
        rig.reset();
        this.puzzle.reset();
        this.slimes.reset();
        this.effects.clear();
        this.input.clear();
        this.state = 'playing';
        this.hud.hideEnd();
        this.hud.setQuest(config.hud.quest.title, config.hud.quest.copy);
        this.hud.setHealth(this.health);
        this.hud.hideToast();
    }

    destroy() {
        this.input.destroy();
        this.effects.clear();
        this.hud.destroy();
    }

    private onKeyDown(code: string) {
        if (code !== 'Escape') this.unpause();
        if (code === 'Space') this.attack();
        if (code === 'Escape') {
            if (this.state === 'playing') this.pause();
            else this.unpause();
        } else this.unpause();
        if (code === 'KeyR' && this.state !== 'playing') this.reset();
    }

    private attack() {
        if (this.state !== 'playing' || !this.sword.ready) return;
        const heading = this.player.heading;
        this.sword.start(heading);
        const p = this.player.position;
        this.effects.arc(p.x, p.z, heading, this.deps.palette.cream);
    }

    private onSlimeHit(slime: Slime) {
        const { palette, config } = this.deps;
        this.effects.burst(slime.x, slime.z, palette.cream);
        if (slime.hp === 0) {
            this.kills++;
            slime.death = SLIME.deathTime;
            this.effects.burst(slime.x, slime.z, palette.pink, 12);
            this.announce(config.text.defeatedSlime);
        }
    }

    private onPlayerHit(ex: number, ez: number, d: number) {
        this.health--;
        this.invincible = 1.2;
        this.hud.setHealth(this.health);
        const p = this.player.position;
        this.effects.burst(p.x, p.z, this.deps.palette.gold, 7);
        const shove = this.collision.resolve(p.x + (ex / (d || 1)) * 0.5, p.z + (ez / (d || 1)) * 0.5);
        this.player.moveTo(shove.x, shove.z);
        if (this.health <= 0) this.showEnd('over');
    }

    private announce(text: string) {
        console.info(this.deps.config.logTag, text, this.diagnostics());
        this.hud.announce(text);
    }

    private showEnd(next: 'won' | 'over') {
        this.state = next;
        console.info(`${this.deps.config.logTag} state`, next, this.diagnostics());
        const card = this.deps.config.text[next];
        this.hud.showEnd(card.title, card.copy);
    }
}
