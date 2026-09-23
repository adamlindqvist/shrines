import type { Entity } from 'playcanvas';

import type { AppContext } from '../app/context';
import type { AdventurerHandles } from '../objects/adventurer';
import type { ChestHandles, PushBlockHandles, SunSwitchHandles } from '../objects/puzzle';
import type { SlimeHandles } from '../objects/slime';
import type { Palette } from '../rendering/palette';
import type { Random } from '../rendering/random';
import type { SceneLayout } from '../scenes/builder';
import type { CameraRig } from '../scenes/camera-rig';
import { Hud } from '../ui/hud';
import type { HudOptions } from '../ui/hud';
import { TouchControls } from '../ui/touch-controls';

import { Collision } from './collision';
import type { Bounds } from './collision';
import { SWORD, Sword } from './combat';
import { Effects } from './effects';
import { Input } from './input';
import { PlayerController } from './player';
import { BlockPuzzle } from './puzzle';
import type { Point, PuzzleConfig } from './puzzle';
import { SLIME, SlimePack } from './slimes';
import type { Slime, SlimeTarget } from './slimes';

export type GameState = 'playing' | 'paused' | 'won' | 'over' | 'complete';

type Card = { title: string; copy: string };

export type AdventureConfig = {
    area: string;
    stage: number;
    /** Number of shrines in the whole journey. */
    stages: number;
    spawn: Point;
    /** Rectangle the player and slimes are kept inside. */
    walkBounds: Bounds;
    puzzle: PuzzleConfig;
    hud: HudOptions;
    text: {
        unlockedQuest: Card;
        unlocked: string;
        matched: string;
        grabbed: string;
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
    blocks: PushBlockHandles[];
    plates: SunSwitchHandles[];
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
    initialHealth?: number;
    onComplete?: (health: number) => void;
    onRestart?: () => void;
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
        this.health = deps.initialHealth ?? config.hud.maxHealth;
        this.collision = new Collision(layout.obstacles, config.walkBounds);
        this.effects = new Effects(root, rand);
        this.player = new PlayerController(cast.player);
        this.slimes = new SlimePack(cast.slimes, this.collision);
        this.puzzle = new BlockPuzzle(config.puzzle, cast.blocks, cast.plates, cast.chest, this.collision, {
            idle: palette.gold,
            lit: palette.teal,
            baseIdle: palette.sandstone
        });
        this.slimeTarget = {
            entity: cast.player.entity,
            canBeHit: () => this.state === 'playing' && this.invincible === 0,
            hit: (ex, ez, d) => this.onPlayerHit(ex, ez, d)
        };
        this.hud = new Hud(config.hud, () => this.restart());
        const touch = new TouchControls(this.hud.root, {
            press: () => this.unpause(),
            attack: () => {
                this.unpause();
                this.attack();
            }
        });
        this.input = new Input(
            context.canvas,
            {
                keydown: (code) => this.onKeyDown(code),
                blur: () => this.pause(),
                pointerdown: () => {
                    this.unpause();
                    this.attack();
                }
            },
            touch
        );
        this.reset();
        this.health = deps.initialHealth ?? config.hud.maxHealth;
        this.hud.setHealth(this.health);
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
        if (this.state !== 'playing') {
            if (this.state !== 'paused') this.updateBlockLift(dt);
            return;
        }
        this.time += dt;
        this.invincible = Math.max(0, this.invincible - dt);
        this.sword.tick(dt);
        this.hud.tick(dt);

        // Movement: steer and constrain the player and any grabbed block together.
        const player = this.player;
        const stride = player.stride(dt, this.input.axis());
        const solved = this.puzzle.constrain(stride, player.position);
        player.moveTo(solved.x, solved.z);
        player.animate(this.time, this.sword.swing, SWORD.swingTime, this.invincible);

        // Combat.
        const p = player.position;
        this.sword.applyHits(p.x, p.z, this.slimes.slimes, (slime) => this.onSlimeHit(slime));
        this.slimes.update(dt, this.time, this.slimeTarget);

        // A lethal slime strike takes precedence over puzzle completion this frame.
        if (this.state !== 'playing') return;

        // Puzzle.
        const { clicked, reached } = this.puzzle.update(dt, player.position);
        const { text, puzzle } = this.deps.config;
        if (clicked.length) {
            this.updateQuest();
            this.announce(this.puzzle.unlocked ? text.unlocked : text.matched);
            for (const plate of clicked) this.effects.burst(plate.x, plate.z, this.deps.palette.gold, 20);
        }
        if (reached) {
            this.effects.burst(puzzle.chest.x, puzzle.chest.z, this.deps.palette.gold, 28);
            if (this.deps.onComplete) {
                this.puzzle.release();
                this.input.clear();
                this.state = 'complete';
                this.deps.onComplete(this.health);
                return;
            }
            this.showEnd('won');
        }

        this.updateBlockLift(dt);
        this.puzzle.updateIndicator(player.position, this.state === 'playing');
        this.deps.layout.animate(this.time);
        const pp = player.position;
        this.deps.rig.follow(pp.x, pp.z, dt);
    }

    diagnostics() {
        const { app, canvas } = this.deps.context;
        const player = this.player.position,
            sun = this.deps.rig.sun.forward;
        return Object.freeze({
            area: this.deps.config.area,
            stage: this.deps.config.stage,
            state: this.state,
            health: this.health,
            elapsed: +this.time.toFixed(2),
            fps: Math.round(this.fps),
            player: { x: player.x, z: player.z },
            // Keep the first-pair aliases for existing development tools.
            block: this.puzzle.diagnostics()[0],
            switch: this.deps.config.puzzle.plates[0],
            blocks: this.puzzle.diagnostics(),
            plates: this.deps.config.puzzle.plates.map((plate, i) => ({
                ...plate,
                active: this.puzzle.plateStates()[i]
            })),
            matched: this.puzzle.matched,
            camera: { x: this.deps.rig.camera.getPosition().x, z: this.deps.rig.camera.getPosition().z },
            unlocked: this.puzzle.unlocked,
            grabbed: this.puzzle.grabbed,
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
        this.updateQuest();
        this.hud.setHealth(this.health);
        this.hud.hideToast();
    }

    destroy() {
        this.input.destroy();
        this.effects.clear();
        this.hud.destroy();
    }

    private onKeyDown(code: string) {
        if (code === 'KeyR' && this.state !== 'playing') {
            this.restart();
            return;
        }
        if (code !== 'Escape') this.unpause();
        if (code === 'Space') this.attack();
        if (code === 'Escape') {
            if (this.state === 'playing') this.pause();
            else this.unpause();
        } else this.unpause();
    }

    private attack() {
        if (this.state !== 'playing') return;
        if (this.puzzle.interact(this.player.position)) {
            if (this.puzzle.grabbed) {
                const block = this.puzzle.heldPosition!;
                this.effects.sand(block.x, block.z, this.deps.palette.cream);
            }
            this.puzzle.updateIndicator(this.player.position);
            this.sword.reset();
            this.updateQuest();
            return;
        }
        if (!this.sword.ready) return;
        const heading = this.player.heading;
        this.sword.start(heading);
        const p = this.player.position;
        this.effects.arc(p.x, p.z, heading, this.deps.palette.cream);
    }

    private updateBlockLift(dt: number) {
        for (const block of this.puzzle.updateLift(dt)) {
            this.effects.sand(block.x, block.z, this.deps.palette.cream);
        }
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
        const shove = this.puzzle.resolvePlayer({ x: p.x + (ex / (d || 1)) * 0.5, z: p.z + (ez / (d || 1)) * 0.5 }, p);
        // Keep the held pair together when taking damage.
        if (!this.puzzle.grabbed) this.player.moveTo(shove.x, shove.z);
        if (this.health <= 0) this.showEnd('over');
    }

    private restart() {
        if (this.deps.onRestart) this.deps.onRestart();
        else this.reset();
    }

    private updateQuest() {
        const { config } = this.deps;
        const quest = this.puzzle.unlocked ? config.text.unlockedQuest : config.hud.quest;
        const progress = `${this.puzzle.matched}/${config.puzzle.blocks.length}`;
        this.hud.setQuest(
            `Shrine ${config.stage}/${config.stages} · ${progress} · ${quest.title}`,
            this.puzzle.grabbed ? config.text.grabbed : quest.copy
        );
    }

    private announce(text: string) {
        console.info(this.deps.config.logTag, text, this.diagnostics());
        this.hud.announce(text);
    }

    private showEnd(next: 'won' | 'over') {
        this.puzzle.release();
        this.puzzle.updateIndicator(this.player.position, false);
        this.state = next;
        console.info(`${this.deps.config.logTag} state`, next, this.diagnostics());
        const card = this.deps.config.text[next];
        this.hud.showEnd(card.title, card.copy);
    }
}
