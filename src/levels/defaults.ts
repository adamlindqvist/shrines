import type { CameraDefinition, LevelText } from './types';

export const DEFAULT_HUD = { title: '', maxHealth: 3 };
export const DEFAULT_TEXT: LevelText = {
    matched: '',
    paused: 'Paus · tryck på en rörelsetangent eller klicka för att fortsätta',
    won: { title: '', copy: '' },
    over: { title: '', copy: '' }
};
export const DEFAULT_LIGHTING: Omit<CameraDefinition, 'camera' | 'follow'> = {
    ambient: [0.74, 0.78, 0.7],
    sun: { position: [-10, 15, -10], color: [1, 0.975, 0.91], intensity: 0.82, shadowDistance: 30 },
    fill: { position: [14, 9, -16], color: [0.74, 0.9, 0.8], intensity: 0.1 }
};
