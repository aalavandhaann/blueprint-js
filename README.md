# README #
This is a javascript floorplanner tool based on the existing typescript based project [blueprint3d](https://github.com/furnishup/blueprint3d)

# CURRENT RELEASE AT 2.0.1 #

Many things have changed with this version,

    * Now the library is a pure MVC framework
    * The models contain only about the data
    * The viewers are respective viewers for the respective dimensions (2d, 3d, 4d? (maybe))
    * Overall improvement towards the performance
    * No more canvas for viewer2d, now using pixijs
    * No more rollup but using parcel bundler now
    * Refer to previous branches for older working versions

## What is missing? ##
~~The 3D items are missing ATM, (WIP, coming soon)~~

~~A major overhaul is in store for viewer3d and 3D items, stay tuned~~

~~Implementation of an application like interface to make the demo more complete (WIP, TODO)~~

## My sincere thanks to the following libraries and their contributors ##

[**threejs - Superheroes from the 3 dimension**](https://www.threejs.com/)

[**pixijs - Superheroes from the 2 dimension**](https://www.pixijs.com/)

[**pixijs-viewport - Hero who saved the 2D day**](https://github.com/davidfig/pixi-viewport)

[**thi.ng/geom-hull - Geometry hero from 'n' dimension**](https://github.com/thi-ng/umbrella)

[**bezier-js - This one curves (like Mr. Fantastic)**](https://pomax.github.io/bezierjs/)

[**gsap - tweening superheros**](https://greensock.com/gsap/)

[**quicksettings - Superhero to mechanize the project**](https://github.com/bit101/quicksettings)

[**archimesh - Superhero of parametric dimensions**](https://github.com/dfelinto/blender-1/tree/master/archimesh)

And of course to [**parcel**](https://parceljs.org/) and [**npm**](https://www.npmjs.com/) for their ever awesomeness. And also to the tons of other libraries to make this project possible

# Texture packs and credits to the people behind it

## Base source location - [3dtextures.me](https://3dtextures.me/) ##

### Floor Textures Credits ###

- [Stylized Stone Floor 001](https://3dtextures.me/2020/07/16/stylized-stone-floor-001/)
- [Terracotta Tiles Floor 003](https://3dtextures.me/2019/05/29/terracotta-tiles-003/)
- [Rubber Floor 001](https://3dtextures.me/2019/07/02/rubber-floor-001/)
- [Marble Tiles 001](https://3dtextures.me/2019/10/07/marble-tiles-001/)
- [Stone Tiles 004](https://3dtextures.me/2020/02/17/stone-tiles-004/)
- [Wood Herringbone Tiles 001](https://3dtextures.me/2020/08/05/wood-herringbone-tiles-001/)
- [Terrazo Tiles 001](https://3dtextures.me/2019/07/19/terrazzo-tiles-001/)


### Wall Textures Credits ###

- [Terracota Bricks 002](https://3dtextures.me/2020/07/09/terracotta-bricks-002/)
- [Stone Wall 015](https://3dtextures.me/2020/06/26/stone-wall-015/)
- [Stylized Sci-fi Wall 001](https://3dtextures.me/2020/06/09/stylized-sci-fi-wall-001/)
- [Concrete Wall 005](https://3dtextures.me/2020/03/30/concrete-wall-005/)
- [Concrete 016](https://3dtextures.me/2019/12/12/concrete-016/)
- [Stone Wall 012](https://3dtextures.me/2019/11/20/stone-wall-012/)
- [Concrete Wall 002](https://3dtextures.me/2019/10/16/concrete-wall-002/)
- [Concrete Column 001](https://3dtextures.me/2019/07/15/concrete-column-001/)
- [Brick Wall 017](https://3dtextures.me/2019/11/21/brick-wall-017/)

## DEMO ##

[Cick for example](https://aalavandhaann.github.io/blueprint-js/demo/)

## DOCS ##
Yes, the initiative has begun for the documentation. Of late I have been getting inquiries on using this framework. It is time to have the documentation rolling
[docs](https://aalavandhaann.github.io/blueprint-js/docs). Look at [wiki](https://github.com/aalavandhaann/blueprint-js/wiki) for some basic integration tips and information. 

## DEMO VR ##
The ability to export the floorplan as GLTF gives the scope of having easy VR with A-Frame. Export the layout to use it directly with A-Frame or process it further using Blender and then use it with A-Frame.

[Cick for example of VR - 1](https://aalavandhaann.github.io/blueprint-js/build/vrtest)
[VR - 2](https://aalavandhaann.github.io/blueprint-js/build/vrtest/minimal.html)

You will notice a lot of flickering in the VR mode. This is because of the overlapping materials in the floorplan.

## What is this?

This is a customizable application built on three.js that allows users to design an interior space such as a home or apartment. Below are screenshots from our Example App (link above).

1) Create 2D floorplan:

![floorplan](./images/floorplan2d.png)

2) Add items:

![add_items](./images/items.png)

3) Design in 3D:

![3d_design](./images/floorplan3d.png)

## Developing and Running Locally


### Scripts and their purpose

- `npm run-script app-dev`: Generates the application and serves the app folder with unminified code
- `npm run-script app-production`: Generates the application and serves the app folder with minified code
- `npm run-script frameworkonly-dev`: Builds and generates only bp3djs.js (unminified) that can be used in your project with custom design. However ensure you know how to use the framework and its api. The generated framework can be found inside `bin` folder.
- `npm run-script app-dev`: Builds and generates only bp3djs.js (minified) that can be used in your project with custom design. However ensure you know how to use the framework and its api. The generated framework can be found inside `bin` folder.

Then, visit `http://localhost:1234` (most probably) in your browser.

## Contribute!

This project and the [original project](https://github.com/furnishup/blueprint3d) requires a lot more work. If you are someone like yodha of typescript then kindly visit the original project, the author is a wonderful human being who facilitated this idea, efforts, and materials in the first place. Else you are someone like me who likes to play around with es6 then you can use this one.

Please contact us if you are interested in contributing.

### Todos and hurrays on completed ones

- More complete documentation of classes (This is necessary and must do for others to contribute)
- Make it easier to build a complete application using blueprint3d (cleaner API, more inclusive base, easier integration with a backend)
- Better serialization format for saving/loading "designs"
- JQuery is not used at all, instead I used the eventdispatcher from threejs (hurray)
- Better use of npm conventions and packaging
- Various bug fixes  (hurray for items that are stuck and don't move)
- refactor three/*
- update to current threejs  (hurray)
- introduce a more formal persistency format
- put all relevant settings into Core.Configuration to make them read-/writeable, User settings?
- complete type docs for all entities
- there're a few TODO_Ekki's left, kill them all (let me know Yodha)

## Directory Structure

### `src/` Directory

The `src` directory contains the core of the project. Here is a description of the various sub-directories:

`core` - Basic utilities such as logging and generic functions

`floorplanner` - 2D view/controller for editing the floorplan

`items` - Various types of items that can go in rooms

`model` - Data model representing both the 2D floorplan and all of the items in it

`three` - 3D view/controller for viewing and modifying item placement

## Notes about changes from the original
- Adding routines to modify the skybox images as environment (a crude implementation)
- Otherwise the api is ditto and the same
- Adding a BoxHelper to show selected states of items

# Support me

<a href='https://ko-fi.com/F1F522LRS' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
