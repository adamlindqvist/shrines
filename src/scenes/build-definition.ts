import type { AdventureCast } from '../gameplay/adventure';
import type { SceneDefinition, SceneObject } from '../levels/types';

import type { SceneBuilder } from './builder';

/** Shared data interpreter. Preserve list order: factories consume the seeded random stream. */
export function buildDefinition(builder: SceneBuilder, definition: SceneDefinition): AdventureCast {
    const cast: AdventureCast = { player: null!, blocks: [], plates: [], chests: [], slimes: [], bridges: [] };
    const add = (object: SceneObject) => {
        switch (object.type) {
            case 'tree':
                builder.addTree(object);
                break;
            case 'rock':
                builder.addRock(object);
                break;
            case 'bush':
                builder.addBush(object);
                break;
            case 'bushCluster':
                builder.addBushCluster(object);
                break;
            case 'pot':
                builder.addPot(object);
                break;
            case 'log':
                builder.addLog(object);
                break;
            case 'signpost':
                builder.addSignpost(object);
                break;
            case 'shrineDais':
                builder.addShrineDais(object);
                break;
            case 'bridge':
                cast.bridges.push(builder.addBridge({ ...object, dynamic: object.state === 'closed' }));
                break;
            case 'block':
                cast.blocks.push(builder.addPushBlock(object, object.symbol));
                break;
            case 'plate':
                cast.plates.push(builder.addSunSwitch({ ...object, rotation: 0 }, object.symbol));
                break;
            case 'chest':
                cast.chests.push(builder.addChest(object));
                break;
            case 'slime':
                cast.slimes.push(builder.addSlime(object));
                break;
            case 'zone':
                break;
        }
    };
    definition.scenery.forEach(add);
    cast.player = builder.addAdventurer(definition.spawn);
    definition.objects.forEach(add);
    return cast;
}
