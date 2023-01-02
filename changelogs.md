# Changelog

## [1.0.0] - 2019-07-20
### Added
* Create Floorplans in 2D and design the rooms in 3D
* Various room type objects such as wall items, flooritems, ceiling items, wall-floor-items etc.
* Naming the rooms
* Switching between various metrics of measurement
* Elevation for corners of a room, to create sloped walls

## [2.0.1] - 2020-08-14
### Major overhaul and updates
* The viewer2d has been completely replaced using PixiJS
* Changed from rollup to Parcel for packaging and bundling
* The current version does not support 3d items and interaction (yet, WIP)
* All GUI and other items have been removed

## [3.0.0] - 2023-01-02
### This is the last backup of release with threeJS version (1.118.0)


## [3.0.1] - 2023-01-02
### This version is updated to latest threejs (1.148.0)
- Major Update: Bump threejs version to latest (1.48.0)
- Breaking changes and needs more testing
- Remove all references to Face3 and Geometry as it is depreceated
- Update all geometries to BufferGeometry
- DragRoomItemsControls3D: replace mouse events with pointer events
- WIP: Text elements for itemstatistics