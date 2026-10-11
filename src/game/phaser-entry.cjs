// Custom entry over the locked, unmodified Phaser 3.90.0 source.
// Follow Phaser's custom-build pattern: register the factories used by the
// procedural scene, retaining both WebGL and Canvas renderers.
const Phaser = require('phaser/src/phaser-core.js')
Phaser.GameObjects.Container = require('phaser/src/gameobjects/container/Container.js')
Phaser.GameObjects.Factories.Container = require('phaser/src/gameobjects/container/ContainerFactory.js')
Phaser.GameObjects.Creators.Container = require('phaser/src/gameobjects/container/ContainerCreator.js')
Phaser.Curves = { Path: require('phaser/src/curves/path/Path.js') }
module.exports = Phaser
