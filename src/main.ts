import './style.css';
import { createApp } from './app/create-app';
import { ProgressStore } from './app/progress';
import { registerGameUpdates } from './app/pwa-updates';
import { SceneHost } from './app/scene-host';
import { adventureJourney } from './levels';
import { scenes } from './scenes';
import type { SceneName } from './scenes';
import { createJourneyScene } from './scenes/journey';

/** Default adventure startup resumes saved progress; other IDs override it for inspection. */
const SCENE: SceneName = 'meadow';

if (import.meta.env.PROD) registerGameUpdates();

const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
const context = await createApp(canvas);
const host = new SceneHost(context);
const sceneNames = Object.keys(scenes) as SceneName[];
const requestedLevel = import.meta.env.DEV ? new URLSearchParams(location.search).get('level') : null;
const requestedScene = requestedLevel ? sceneNames[Number(requestedLevel) - 1] : undefined;
const progress = new ProgressStore(adventureJourney.levels);
if (requestedScene) {
    // Development inspections are isolated from the player's save and unlocks.
    host.load(scenes[requestedScene]);
} else if (SCENE === adventureJourney.restart) {
    host.load((appContext) =>
        createJourneyScene(appContext, progress.checkpoint, adventureJourney, progress, import.meta.env.DEV)
    );
} else {
    host.load(scenes[SCENE]);
}
context.app.start();

if (import.meta.env.DEV) {
    // Console hook for checking teardown: `shrines.load('sun-moon')`, `shrines.load('meadow')`.
    Object.assign(window, {
        shrines: {
            load: (name: SceneName) => {
                if (!Object.hasOwn(scenes, name)) throw new Error(`Unknown scene: ${name}`);
                host.load(scenes[name]);
            },
            unload: () => host.unload()
        }
    });
}
