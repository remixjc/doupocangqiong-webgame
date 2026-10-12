// Custom entry over the locked, unmodified Phaser 3.90.0 source.
// Expose the runtime API used by AdventureScene and GameView. Each upstream
// module requires its own dependencies; both renderer implementations remain.
// Register factories explicitly: importing a class alone does not register it.
require('phaser/src/polyfills/requestVideoFrame')
// Phaser registers these through namespace imports in phaser-core. Keep the
// registrations even when their namespaces are not exposed by this entry.
require('phaser/src/events/EventEmitter')
require('phaser/src/cameras/2d/CameraManager')
require('phaser/src/gameobjects/GameObjectCreator')
require('phaser/src/gameobjects/DisplayList')
require('phaser/src/gameobjects/UpdateList')
require('phaser/src/scene/ScenePlugin')
require('phaser/src/time/Clock')
require('phaser/src/data/DataManagerPlugin')
require('phaser/src/input/InputPlugin')
require('phaser/src/input/keyboard/KeyboardPlugin')
require('phaser/src/input/gamepad/GamepadPlugin')
require('phaser/src/loader/LoaderPlugin')
require('phaser/src/tweens/TweenManager')
require('phaser/src/gameobjects/lights/LightsPlugin')
require('phaser/src/gameobjects/graphics/GraphicsFactory')
require('phaser/src/gameobjects/text/TextFactory')
require('phaser/src/gameobjects/container/ContainerFactory')

module.exports = {
  ...require('phaser/src/const'),
  Game: require('phaser/src/core/Game'),
  Scene: require('phaser/src/scene/Scene'),
  Scale: require('phaser/src/scale'),
  Curves: { Path: require('phaser/src/curves/path/Path') },
  GameObjects: {
    Graphics: require('phaser/src/gameobjects/graphics/Graphics'),
    Text: require('phaser/src/gameobjects/text/Text'),
    Container: require('phaser/src/gameobjects/container/Container'),
  },
}
