import type { Entity } from 'playcanvas';

import type { AppContext } from '../app/context';
import type { LevelDefinition, SceneDefinition, SceneObject } from '../levels/types';
import type { AdventurerHandles } from '../objects/adventurer';
import type { PortalHandles, PushBlockHandles, SunSwitchHandles } from '../objects/puzzle';
import type { SlimeHandles } from '../objects/slime';
import type { Palette } from '../rendering/palette';
import type { Random } from '../rendering/random';
import type { SceneLayout } from '../scenes/builder';
import type { CameraRig } from '../scenes/camera-rig';
import { Hud } from '../ui/hud';
import { TouchControls } from '../ui/touch-controls';

import { Collision } from './collision';
import { Sword } from './combat';
import { Effects } from './effects';
import { Input } from './input';
import { BridgeController, PortalController, ZoneTracker } from './level-objects';
import type { BridgeHandles } from './level-objects';
import { MovementTrail } from './movement-trail';
import { PlatformController } from './platforms';
import type { PlatformHandles } from './platforms';
import { PLAYER, PlayerController } from './player';
import { BlockPuzzle } from './puzzle';
import type { Point, PuzzleConfig } from './puzzle';
import { LevelRules } from './rules';
import { SLIME, SlimePack } from './slimes';
import type { Slime, SlimeTarget } from './slimes';

export type GameState = 'playing' | 'paused' | 'won' | 'over' | 'complete';

/**
 * Stepping into open water: the player drops `fallDepth` below the deck over `sinkTime`
 * gameplay seconds, loses a heart and respawns on the last safe footing.
 */
export const WATER = { sinkTime: 0.7, fallDepth: 2.6, invulnerable: 1.2 };

/** Entities the adventure animates, as returned by the scene builder. */
export type AdventureCast = {
    player: AdventurerHandles;
    slimes: SlimeHandles[];
    blocks: PushBlockHandles[];
    plates: SunSwitchHandles[];
    portals: PortalHandles[];
    bridges: BridgeHandles[];
    platforms: PlatformHandles[];
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
    scene: SceneDefinition;
    level: LevelDefinition;
    stage?: number;
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
    splashes = 0;
    private invincible = 0;
    /** Remaining sink time while the player is under after a splash; 0 when on land. */
    private splash = 0;
    private splashedWater = false;
    private lastSafe: Point = { x: 0, z: 0 };
    private fps = 60;
    private frameTime = 0;
    private frameCount = 0;

    private readonly input: Input;
    private readonly hud: Hud;
    private readonly effects: Effects;
    private readonly movementTrail: MovementTrail;
    private readonly collision: Collision;
    private readonly player: PlayerController;
    private readonly sword = new Sword();
    private readonly slimes: SlimePack;
    private readonly puzzle: BlockPuzzle;
    private readonly slimeTarget: SlimeTarget;
    private readonly rules: LevelRules;
    private readonly portals: PortalController[];
    private readonly bridges: BridgeController[];
    private readonly platforms: PlatformController[];
    private readonly zones: ZoneTracker;
    private readonly puzzleConfig: PuzzleConfig;
    private readonly objects: SceneObject[];

    private readonly deps: AdventureDeps;

    constructor(deps: AdventureDeps) {
        this.deps = deps;
        this.objects = [...deps.scene.scenery, ...deps.scene.objects];
        const { context, root, rand, palette, layout, cast, scene, level } = deps;
        this.health = deps.initialHealth ?? level.hud.maxHealth;
        this.collision = new Collision(layout.obstacles, scene.walkBounds, layout.surfaces, layout.water);
        this.effects = new Effects(root, rand, (x, z) => this.collision.heightAt(x, z));
        this.movementTrail = new MovementTrail(context.device, root, (x, z) => this.collision.heightAt(x, z));
        const walkSpeed = PLAYER.walkSpeed * (context.debug ? PLAYER.debugSpeedScale : 1);
        this.player = new PlayerController(cast.player, this.collision, walkSpeed);
        this.slimes = new SlimePack(cast.slimes, this.collision);
        this.puzzleConfig = {
            blocks: this.objects.filter((o) => o.type === 'block'),
            plates: this.objects.filter((o) => o.type === 'plate'),
            blockBounds: scene.blockBounds
        };
        this.puzzle = new BlockPuzzle(this.puzzleConfig, cast.blocks, cast.plates, this.collision, {
            idle: palette.gold,
            lit: palette.teal,
            baseIdle: palette.sandstone
        });
        this.rules = new LevelRules(level);
        this.portals = this.objects
            .filter((o) => o.type === 'portal')
            .map((o, i) => new PortalController(o, cast.portals[i]));
        this.bridges = this.objects
            .filter((o) => o.type === 'bridge')
            .map((o, i) => new BridgeController(o, cast.bridges[i]));
        this.platforms = this.objects
            .filter((o) => o.type === 'platform')
            .map((o, i) => new PlatformController(o, cast.platforms[i]));
        this.zones = new ZoneTracker(this.objects.filter((o) => o.type === 'zone'));
        this.slimeTarget = {
            entity: cast.player.entity,
            canBeHit: () => this.state === 'playing' && this.invincible === 0 && this.splash === 0,
            hit: (ex, ez, d) => this.onPlayerHit(ex, ez, d)
        };
        this.hud = new Hud(level.hud, () => this.restart());
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
        this.health = deps.initialHealth ?? level.hud.maxHealth;
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
        if (this.state !== 'paused') {
            this.effects.update(dt);
            this.movementTrail.update(dt);
        }
        if (this.state !== 'playing') {
            if (this.state !== 'paused') this.updateBlockLift(dt);
            return;
        }
        this.time += dt;
        this.invincible = Math.max(0, this.invincible - dt);
        this.sword.tick(dt);
        this.hud.tick(dt);

        // Platforms move first so input resolves against where they are this frame.
        this.ridePlatforms(dt);

        // Movement: facing locks while holding a block, and the pair translates rigidly.
        const player = this.player;
        let dx = 0,
            dz = 0;
        if (this.splash > 0) this.updateSplash(dt);
        else {
            const stride = player.stride(dt, this.input.axis(), !this.puzzle.grabbed);
            const solved = this.puzzle.constrain(stride, player.position);
            dx = solved.x - player.position.x;
            dz = solved.z - player.position.z;
            this.movementTrail.sample(player.position.x, player.position.z, dx, dz);
            player.moveTo(solved.x, solved.z);
            this.checkWater();
        }
        player.animate({
            dt,
            time: this.time,
            dx,
            dz,
            carrying: this.puzzle.grabbed,
            swing: this.sword.swing,
            attackHeading: this.sword.attackHeading,
            invincible: this.invincible
        });
        if (this.sword.consumeActiveStart()) {
            const p = player.position;
            this.effects.arc(p.x, p.z, this.sword.attackHeading, this.deps.palette.cream);
        }

        // Combat.
        const p = player.position;
        this.sword.applyHits(p.x, p.z, this.slimes.slimes, (slime) => this.onSlimeHit(slime));
        this.slimes.update(dt, this.time, this.slimeTarget);

        // A lethal slime strike or splash takes precedence over puzzle completion this frame.
        if (this.state !== 'playing') return;

        const { clicked } = this.puzzle.update(player.position);
        if (clicked.length) {
            this.announce(this.deps.level.text.matched);
            for (const plate of clicked) this.effects.burst(plate.x, plate.z, this.deps.palette.gold, 20);
        }
        for (const bridge of this.bridges) bridge.update(dt);
        for (const portal of this.portals) {
            // Turquoise sparks mark the gate settling onto its plinth, just as the swirl blooms.
            if (portal.update(dt, player.position, this.collision).landed)
                this.effects.burst(portal.definition.x, portal.definition.z, this.deps.palette.teal, 16);
        }
        this.zones.update(player.position);
        const plates = this.puzzle.plateStates();
        const enemies = this.objects.filter((o) => o.type === 'slime');
        const snapshot = {
            plateActive: new Set(
                this.objects
                    .filter((o) => o.type === 'plate')
                    .filter((_, i) => plates[i])
                    .map((o) => o.id)
            ),
            enemyDefeated: new Set(enemies.filter((_, i) => this.slimes.slimes[i].hp === 0).map((o) => o.id)),
            portalReached: new Set(this.portals.filter((p) => p.reached).map((p) => p.definition.id)),
            zoneVisited: new Set(this.zones.visited)
        };
        for (const rule of this.rules.update(snapshot)) {
            for (const action of rule.actions) {
                switch (action.type) {
                    case 'openPortal': {
                        const portal = this.portals.find((p) => p.definition.id === action.target)!;
                        // Sand kicks off the plinth as the buried gate starts to push through.
                        if (!portal.unlocked)
                            this.effects.sand(portal.definition.x, portal.definition.z, this.deps.palette.cream, 1.15);
                        portal.open();
                        break;
                    }
                    case 'openBridge':
                        this.bridges.find((b) => b.definition.id === action.target)!.open();
                        break;
                    case 'activatePlatform': {
                        const platform = this.platforms.find((p) => p.definition.id === action.target)!;
                        // Foam marks each stone surfacing from the river.
                        if (platform.state === 'dormant') {
                            const at = platform.position;
                            this.effects.splash(at.x, this.waterLevel, at.z, this.deps.palette.foam, 20);
                        }
                        platform.activate();
                        break;
                    }
                }
            }
            if (rule.message) this.announce(rule.message);
        }
        if (this.rules.complete) {
            const reward = this.portals.find((p) => p.reached)?.definition ?? player.position;
            this.effects.burst(reward.x, reward.z, this.deps.palette.gold, 28);
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
            area: this.deps.level.id,
            stage: this.deps.stage ?? 1,
            state: this.state,
            health: this.health,
            elapsed: +this.time.toFixed(2),
            fps: Math.round(this.fps),
            player: { x: player.x, y: player.y, z: player.z },
            // Keep the first-pair aliases for existing development tools.
            block: this.puzzle.diagnostics()[0],
            switch: this.puzzleConfig.plates[0],
            blocks: this.puzzle
                .diagnostics()
                .map((b, i) => ({ ...b, id: this.objects.filter((o) => o.type === 'block')[i].id })),
            plates: this.puzzleConfig.plates.map((plate, i) => ({
                ...plate,
                active: this.puzzle.plateStates()[i]
            })),
            matched: this.puzzle.matched,
            camera: { x: this.deps.rig.camera.getPosition().x, z: this.deps.rig.camera.getPosition().z },
            unlocked: this.portals.length > 0 && this.portals.every((p) => p.unlocked),
            grabbed: this.puzzle.grabbed,
            kills: this.kills,
            enemies: this.slimes.slimes.map((e, i) => ({
                id: this.objects.filter((o) => o.type === 'slime')[i].id,
                x: e.x,
                z: e.z,
                hp: e.hp,
                mode: e.mode
            })),
            portals: this.portals.map((p) => ({
                id: p.definition.id,
                unlocked: p.unlocked,
                reached: p.reached,
                progress: +p.progress.toFixed(2)
            })),
            bridges: this.bridges.map((b) => ({ id: b.definition.id, state: b.state })),
            platforms: this.platforms.map((p) => ({
                id: p.definition.id,
                state: p.state,
                x: +p.position.x.toFixed(2),
                z: +p.position.z.toFixed(2)
            })),
            splashing: this.splash > 0,
            splashes: this.splashes,
            visitedZones: [...this.zones.visited],
            ...this.rules.diagnostics(),
            attackCooldown: this.sword.cooldown,
            effects: this.effects.count,
            movementSmoke: this.movementTrail.count,
            drawCalls: app.stats.drawCalls.total,
            backbuffer: { width: canvas.width, height: canvas.height },
            sun: { fx: +sun.x.toFixed(3), fy: +sun.y.toFixed(3), fz: +sun.z.toFixed(3) }
        });
    }

    pause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.input.clear();
            this.hud.notify(this.deps.level.text.paused);
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
        const { scene, level, rig } = this.deps;
        this.health = level.hud.maxHealth;
        this.time = 0;
        this.invincible = 0;
        this.kills = 0;
        this.splashes = 0;
        this.splash = 0;
        this.splashedWater = false;
        this.lastSafe = { x: scene.spawn.x, z: scene.spawn.z };
        this.sword.reset();
        this.player.reset(scene.spawn.x, scene.spawn.z);
        rig.reset();
        this.puzzle.reset();
        this.rules.reset();
        this.portals.forEach((p) => p.reset());
        this.bridges.forEach((b) => b.reset());
        this.platforms.forEach((p) => p.reset());
        this.zones.reset();
        this.slimes.reset();
        this.effects.clear();
        this.movementTrail.reset();
        this.input.clear();
        this.state = 'playing';
        this.hud.hideEnd();
        this.hud.setHealth(this.health);
        this.hud.hideToast();
    }

    destroy() {
        this.input.destroy();
        this.effects.clear();
        this.movementTrail.destroy();
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
        if (this.state !== 'playing' || this.splash > 0) return;
        if (this.puzzle.interact(this.player.position)) {
            if (this.puzzle.grabbed) {
                const block = this.puzzle.heldPosition!;
                const p = this.player.position;
                this.player.face(Math.atan2(block.x - p.x, block.z - p.z));
                this.effects.sand(block.x, block.z, this.deps.palette.cream);
            }
            this.puzzle.updateIndicator(this.player.position);
            this.sword.reset();
            this.player.cancelAttackPose();
            return;
        }
        if (!this.sword.ready) return;
        const heading = this.player.heading;
        this.sword.start(heading);
    }

    private updateBlockLift(dt: number) {
        for (const block of this.puzzle.updateLift(dt)) {
            this.effects.sand(block.x, block.z, this.deps.palette.cream);
        }
    }

    private onSlimeHit(slime: Slime) {
        const { palette } = this.deps;
        this.effects.burst(slime.x, slime.z, palette.cream);
        if (slime.hp === 0) {
            this.kills++;
            slime.death = SLIME.deathTime;
            this.effects.burst(slime.x, slime.z, palette.pink, 12);
        }
    }

    private onPlayerHit(ex: number, ez: number, d: number) {
        this.health--;
        this.invincible = 1.2;
        this.hud.setHealth(this.health);
        const p = this.player.position;
        this.effects.burst(p.x, p.z, this.deps.palette.gold, 7);
        // Shoves never knock the player into open water.
        const shove = this.puzzle.resolvePlayer(
            { x: p.x + (ex / (d || 1)) * 0.5, z: p.z + (ez / (d || 1)) * 0.5 },
            p,
            true
        );
        // Suppress shoves while holding to preserve the grab distance.
        if (!this.puzzle.grabbed) this.player.moveTo(shove.x, shove.z);
        if (this.health <= 0) this.showEnd('over');
    }

    /** Water surface height for splash effects; plain islands have no water. */
    private get waterLevel() {
        const terrain = this.deps.scene.terrain;
        return 'kind' in terrain ? terrain.waterLevel : 0;
    }

    /**
     * Moves each platform and carries what rested on it beforehand: the player (with any held
     * block, which always follows the player), resting blocks and living slimes.
     */
    private ridePlatforms(dt: number) {
        for (const platform of this.platforms) {
            const on = (x: number, z: number) => platform.contains(x, z);
            const p = this.player.position;
            const px = p.x,
                pz = p.z;
            const riding = this.splash === 0 && on(px, pz);
            const blocks = this.puzzle.restingWhere(on);
            const slimes = this.slimes.slimes.filter((e) => e.hp > 0 && on(e.x, e.z));
            const { dx, dz } = platform.update(dt);
            if (!dx && !dz) continue;
            if (riding) this.player.moveTo(px + dx, pz + dz);
            this.puzzle.shift(blocks, dx, dz, riding);
            for (const e of slimes) {
                e.x += dx;
                e.z += dz;
            }
        }
    }

    /** Sinks blocks left over open water and splashes the player if they stepped off. */
    private checkWater() {
        const { palette } = this.deps;
        for (const { from, to } of this.puzzle.sinkIntoWater()) {
            this.effects.splash(from.x, this.waterLevel, from.z, palette.foam, 18);
            this.effects.sand(to.x, to.z, palette.cream);
        }
        const p = this.player.position;
        if (this.collision.isWater(p.x, p.z)) {
            this.splash = WATER.sinkTime;
            this.splashedWater = false;
            this.splashes++;
            this.health--;
            this.hud.setHealth(this.health);
            this.puzzle.release();
            this.player.moveX = this.player.moveZ = 0;
            this.input.clear();
        } else if (!this.platforms.some((platform) => platform.contains(p.x, p.z)))
            this.lastSafe = { x: p.x, z: p.z };
    }

    /** Drops the player into the river, then respawns them, or ends the run on the last heart. */
    private updateSplash(dt: number) {
        const { palette } = this.deps;
        this.splash = Math.max(0, this.splash - dt);
        const p = this.player.position;
        const t = 1 - this.splash / WATER.sinkTime;
        const y = -WATER.fallDepth * t * t;
        this.player.handles.entity.setPosition(p.x, y, p.z);
        if (!this.splashedWater && y <= this.waterLevel) {
            this.splashedWater = true;
            this.effects.splash(p.x, this.waterLevel, p.z, palette.foam);
        }
        if (this.splash > 0) return;
        if (this.health <= 0) {
            this.showEnd('over');
            return;
        }
        this.player.moveTo(this.lastSafe.x, this.lastSafe.z);
        this.invincible = WATER.invulnerable;
        this.effects.sand(this.lastSafe.x, this.lastSafe.z, palette.cream, 0.5);
    }

    private restart() {
        if (this.deps.onRestart) this.deps.onRestart();
        else this.reset();
    }

    private announce(text: string) {
        if (!text) return;
        console.info(`[${this.deps.level.id}]`, text, this.diagnostics());
        this.hud.announce(text);
    }

    private showEnd(next: 'won' | 'over') {
        this.puzzle.release();
        this.puzzle.updateIndicator(this.player.position, false);
        this.state = next;
        console.info(`${`[${this.deps.level.id}]`} state`, next, this.diagnostics());
        const card = this.deps.level.text[next];
        this.hud.showEnd(card.title, card.copy);
    }
}
