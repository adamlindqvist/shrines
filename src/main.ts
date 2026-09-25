import './style.css';
import { createApp } from './app/create-app';
import { SceneHost } from './app/scene-host';
import { scenes } from './scenes';
import type { SceneName } from './scenes';

/** The level to start. */
const SCENE: SceneName = 'meadow';

const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
const context = await createApp(canvas);
const host = new SceneHost(context);
const sceneNames = Object.keys(scenes) as SceneName[];
const requestedLevel = import.meta.env.DEV ? new URLSearchParams(location.search).get('level') : null;
const requestedScene = requestedLevel ? sceneNames[Number(requestedLevel) - 1] : undefined;
const initialScene = requestedScene ?? SCENE;
host.load(scenes[initialScene]);
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
