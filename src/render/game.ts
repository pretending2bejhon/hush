import * as Phaser from 'phaser';

// The one canvas config of the product (spec section 10.1): WebGL, 1280 by 720 fitted to the window, no Phaser
// input or audio (the keys and the engine are ours), no physics, no banner.
export function createGame(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#07080d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { limit: 0 },
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false, windowEvents: false },
    banner: false,
    scene: scenes,
  });
}
