import { BlueprintJS } from './scripts/blueprint.js';
import { EVENT_LOADED, EVENT_NOTHING_2D_SELECTED, EVENT_CORNER_2D_CLICKED, EVENT_WALL_2D_CLICKED, EVENT_ROOM_2D_CLICKED, EVENT_WALL_CLICKED, EVENT_ROOM_CLICKED, EVENT_NO_ITEM_SELECTED } from './scripts/core/events.js';
import { Configuration, configDimUnit } from './scripts/core/configuration.js';
import { dimMeter } from './scripts/core/constants.js';
import QuickSettings from 'quicksettings';

import * as floor_textures_json from './floor_textures.json';
import * as wall_textures_json from './wall_textures.json';
import { Dimensioning } from './scripts/core/dimensioning.js';

let startY = 0;
let panelWidths = 200;
let uxInterfaceHeight = 230;
let subPanelsHeight = 460;
let empty = '{"floorplan":{"version":"2.0.1a","corners":{"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":0,"y":0,"elevation":2.5},"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":0,"y":5,"elevation":2.5},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":5,"y":5,"elevation":2.5},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":5,"y":0,"elevation":2.5}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":-176.77669529663686,"y":176.7766952966369},"b":{"x":-176.7766952966369,"y":323.22330470336317}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":176.7766952966369,"y":676.7766952966368},"b":{"x":323.22330470336317,"y":676.776695296637}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":676.7766952966368,"y":323.2233047033631},"b":{"x":676.776695296637,"y":176.77669529663686}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":323.2233047033631,"y":-176.77669529663686},"b":{"x":176.77669529663686,"y":-176.7766952966369}}],"rooms":{"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2,4e3d65cb-54c0-0681-28bf-bddcc7bdb571,da026c08-d76a-a944-8e7b-096b752da9ed,f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"name":"Ashok\'s Room"}},"wallTextures":[],"floorTextures":{},"newFloorTextures":{},"carbonSheet":{},"units":"m"},"items":[{"id":"7d0b3e90-c315-e7a5-a6d9-594757d5b7e4","itemName":"An Item","itemType":3,"position":[65.00000000000006,88.19608972775876,292.4379793118495],"rotation":[0,1.5707963267948966,0],"scale":[1,1,1],"size":[240,100,50],"fixed":true,"resizable":true,"modelURL":"models/HollowCube.glb"},{"itemName":"Lantern","itemType":9,"position":[435,30,265.8727998642687],"rotation":[0,-1.5707963267948966,0],"scale":[1,1,1],"size":[240,50,100],"fixed":false,"resizable":false,"modelURL":"models/Cube.glb"},{"itemName":"Lantern","itemType":4,"position":[260.0256835276736,220,244.4952575168973],"rotation":[0,0,0],"scale":[1,1,1],"size":[240,50,100],"fixed":false,"resizable":false,"modelURL":"models/Cube.glb"}, {"itemName":"Parametric Door", "isParametric": true, "baseParametricType": "DOOR", "subParametricData": {"type": 1, "frameColor": "#00FF00", "doorColor": "#0000FF", "openDirection": "LEFT"}, "itemType":7,"position":[100, 0, 0],"rotation":[0,0,0],"scale":[1,1,1],"size":[100,200,20], "fixed":false,"resizable":false}, {"itemName":"Parametric Door", "isParametric": true, "baseParametricType": "DOOR", "subParametricData": {"type": 1, "frameColor": "#00FF00", "doorColor": "#0000FF", "openDirection": "NO_DOORS"}, "itemType":7,"position":[100, 0, 0],"rotation":[0,0,0],"scale":[1,1,1],"size":[100,200,20], "fixed":false,"resizable":false}]}';

let floor_textures = floor_textures_json['default'];
let floor_texture_keys = Object.keys(floor_textures);

let wall_textures = wall_textures_json['default'];
let wall_texture_keys = Object.keys(wall_textures);

let blueprint3d = null;

let app_parent = document.getElementById('bp3d-js-app');

let configurationHelper = null;
let floorplanningHelper = null;
let roomplanningHelper = null;


let settingsViewer2d = null;
let settingsSelectedCorner = null;
let settingsSelectedWall = null;
let settingsSelectedRoom = null;

let settingsSelectedRoom3D = null;
let settingsSelectedWall3D = null;

let settingsViewer3d = null;
let uxInterface = null;


let opts = {
    viewer2d: {
        id: 'bp3djs-viewer2d',
        viewer2dOptions: {
            'corner-radius': 7.5,
            pannable: true,
            zoomable: true,
            dimlinecolor: '#3E0000',
            dimarrowcolor: '#FF0000',
            dimtextcolor: '#000000'
        }
    },
    viewer3d: 'bp3djs-viewer3d',
    textureDir: "models/textures/",
    widget: false,
    resize: true,
};

function selectFloorTexture(data) {
    if (!data.index) {
        data = settingsSelectedRoom3D.getValue('Floor Textures');
    }
    let floor_texture_pack = floor_textures[data.value];
    settingsSelectedRoom3D.setValue('Floor Texture:', floor_texture_pack.colormap);
    roomplanningHelper.roomTexturePack = floor_texture_pack;
}

function selectWallTexture(data) {
    if (!data.index) {
        if (settingsSelectedWall3D._hidden && !settingsSelectedRoom3D._hidden) {
            data = settingsSelectedRoom3D.getValue('All Wall Textures');
        } else {
            data = settingsSelectedWall3D.getValue('Wall Textures');
        }

    }
    let wall_texture_pack = wall_textures[data.value];
    if (settingsSelectedWall3D._hidden && !settingsSelectedRoom3D._hidden) {
        settingsSelectedRoom3D.setValue('All Wall Texture:', wall_texture_pack.colormap);
        roomplanningHelper.roomWallsTexturePack = wall_texture_pack;
    } else {
        settingsSelectedWall3D.setValue('Wall Texture:', wall_texture_pack.colormap);
        roomplanningHelper.wallTexturePack = wall_texture_pack;
    }
}

function switchViewer() {
    blueprint3d.switchView();
    if (blueprint3d.currentView === 2) {
        uxInterface.setValue("Current View", "Floor Planning");
        settingsViewer3d.hide();
        settingsViewer2d.show();

        settingsSelectedWall3D.hide();
        settingsSelectedRoom3D.hide();

    } else if (blueprint3d.currentView === 3) {
        uxInterface.setValue("Current View", "Room Planning");
        settingsViewer2d.hide();
        settingsSelectedCorner.hide();
        settingsSelectedWall.hide();
        settingsSelectedRoom.hide();
        settingsViewer3d.show();
    }
}

function switchViewer2DToDraw() {
    blueprint3d.setViewer2DModeToDraw();
}

function switchViewer2DToMove() {
    blueprint3d.setViewer2DModeToMove();
}

function loadBlueprint3DDesign(filedata) {
    let reader = new FileReader();
    reader.onload = function(event) {
        let data = event.target.result;
        blueprint3d.model.loadSerialized(data);
    };
    reader.readAsText(filedata);
}

function saveBlueprint3DDesign() {
    var data = blueprint3d.model.exportSerialized();
    var a = window.document.createElement('a');
    var blob = new Blob([data], { type: 'text' });
    a.href = window.URL.createObjectURL(blob);
    a.download = 'design.blueprint3d';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// document.addEventListener('DOMContentLoaded', function() {
console.log('ON DOCUMENT READY ');
blueprint3d = new BlueprintJS(opts);
Configuration.setValue(configDimUnit, dimMeter);

configurationHelper = blueprint3d.configurationHelper;
floorplanningHelper = blueprint3d.floorplanningHelper;
roomplanningHelper = blueprint3d.roomplanningHelper;

blueprint3d.model.addEventListener(EVENT_LOADED, function() { console.log('LOAD SERIALIZED JSON ::: '); });
blueprint3d.floorplanner.addFloorplanListener(EVENT_NOTHING_2D_SELECTED, function() {
    settingsSelectedCorner.hide();
    settingsSelectedWall.hide();
    settingsSelectedRoom.hide();
});
blueprint3d.floorplanner.addFloorplanListener(EVENT_CORNER_2D_CLICKED, function(evt) {
    settingsSelectedCorner.show();
    settingsSelectedWall.hide();
    settingsSelectedRoom.hide();
    settingsSelectedCorner.setValue('cornerElevation', Dimensioning.cmToMeasureRaw(evt.item.elevation));
});
blueprint3d.floorplanner.addFloorplanListener(EVENT_WALL_2D_CLICKED, function(evt) {
    settingsSelectedCorner.hide();
    settingsSelectedWall.show();
    settingsSelectedRoom.hide();
    settingsSelectedWall.setValue('wallThickness', Dimensioning.cmToMeasureRaw(evt.item.thickness));
});
blueprint3d.floorplanner.addFloorplanListener(EVENT_ROOM_2D_CLICKED, function(evt) {
    settingsSelectedCorner.hide();
    settingsSelectedWall.hide();
    settingsSelectedRoom.show();
    settingsSelectedRoom.setValue('roomName', evt.item.name);
});


blueprint3d.roomplanner.addRoomplanListener(EVENT_NO_ITEM_SELECTED, function() {
    settingsSelectedWall3D.hide();
    settingsSelectedRoom3D.hide();
});
blueprint3d.roomplanner.addRoomplanListener(EVENT_WALL_CLICKED, function(evt) {
    settingsSelectedWall3D.show();
    settingsSelectedRoom3D.hide();
});
blueprint3d.roomplanner.addRoomplanListener(EVENT_ROOM_CLICKED, function(evt) {
    settingsSelectedWall3D.hide();
    settingsSelectedRoom3D.show();
});



blueprint3d.model.loadSerialized(empty);


if (!opts.widget) {
    uxInterface = QuickSettings.create(0, 0, 'BlueprintJS', app_parent);

    settingsViewer2d = QuickSettings.create(0, 0, 'Viewer 2D', app_parent);
    settingsSelectedCorner = QuickSettings.create(0, 0, 'Corner', app_parent);
    settingsSelectedWall = QuickSettings.create(0, 0, 'Wall', app_parent);
    settingsSelectedRoom = QuickSettings.create(0, 0, 'Room', app_parent);

    settingsViewer3d = QuickSettings.create(0, 0, 'Viewer 3D', app_parent);
    settingsSelectedWall3D = QuickSettings.create(0, 0, 'Wall', app_parent);
    settingsSelectedRoom3D = QuickSettings.create(0, 0, 'Room', app_parent);


    uxInterface.addButton('Switch Viewer', switchViewer);
    uxInterface.addHTML('Current View', 'Floorplanning');

    uxInterface.addFileChooser("Load Design", "Load Design", ".blueprint3d", loadBlueprint3DDesign);
    uxInterface.addButton('Save Design', saveBlueprint3DDesign);

    settingsViewer2d.addButton('Draw Mode', switchViewer2DToDraw);
    settingsViewer2d.addButton('Move Mode', switchViewer2DToMove);

    settingsViewer2d.bindBoolean('snapToGrid', configurationHelper.snapToGrid, configurationHelper);
    settingsViewer2d.bindBoolean('directionalDrag', configurationHelper.directionalDrag, configurationHelper);
    settingsViewer2d.bindBoolean('dragOnlyX', configurationHelper.dragOnlyX, configurationHelper);
    settingsViewer2d.bindBoolean('dragOnlyY', configurationHelper.dragOnlyY, configurationHelper);
    settingsViewer2d.bindRange('snapTolerance', 1, 200, configurationHelper.snapTolerance, 1, configurationHelper);
    settingsViewer2d.bindRange('gridSpacing', 10, 200, configurationHelper.gridSpacing, 1, configurationHelper);
    settingsViewer2d.bindNumber('boundsX', 1, 200, configurationHelper.boundsX, 1, configurationHelper);
    settingsViewer2d.bindNumber('boundsY', 1, 200, configurationHelper.boundsY, 1, configurationHelper);

    settingsSelectedCorner.bindRange('cornerElevation', 0, 500, floorplanningHelper.cornerElevation, 1, floorplanningHelper);
    settingsSelectedWall.bindRange('wallThickness', 0, 100, floorplanningHelper.wallThickness, 0.1, floorplanningHelper);
    settingsSelectedRoom.bindText('roomName', floorplanningHelper.roomName, floorplanningHelper);

    // settingsViewer3d.addDropDown('Floor Textures', floor_texture_keys, selectFloorTexture);
    // settingsViewer3d.addImage('Floor Texture:', floor_textures[floor_texture_keys[0]].colormap, null);
    // settingsViewer3d.addButton('Apply', selectFloorTexture);

    // settingsViewer3d.addDropDown('Wall Textures', wall_texture_keys, selectWallTexture);
    // settingsViewer3d.addImage('Wall Texture:', wall_textures[wall_texture_keys[0]].colormap, null);
    // settingsViewer3d.addButton('Apply', selectWallTexture);

    settingsSelectedRoom3D.addDropDown('Floor Textures', floor_texture_keys, selectFloorTexture);
    settingsSelectedRoom3D.addImage('Floor Texture:', floor_textures[floor_texture_keys[0]].colormap, null);
    settingsSelectedRoom3D.addButton('Apply', selectFloorTexture);

    settingsSelectedRoom3D.addDropDown('All Wall Textures', wall_texture_keys, selectWallTexture);
    settingsSelectedRoom3D.addImage('All Wall Texture:', wall_textures[wall_texture_keys[0]].colormap, null);
    settingsSelectedRoom3D.addButton('Apply', selectWallTexture);

    settingsSelectedWall3D.addDropDown('Wall Textures', wall_texture_keys, selectWallTexture);
    settingsSelectedWall3D.addImage('Wall Texture:', wall_textures[wall_texture_keys[0]].colormap, null);
    settingsSelectedWall3D.addButton('Apply', selectWallTexture);

    settingsViewer3d.addHTML('Tips:', '<p>Click and drag to rotate the room in 360\xB0</p><p>Add room items (Coming soon)</p><p>Drag and Place items(pink boxes) in the room</p><p>There are 8 different types of items <ul><li>1: FloorItem</li> <li>2: WallItem</li> <li>3: InWallItem</li> <li>7: InWallFloorItem</li> <li>8: OnFloorItem</li> <li>9: WallFloorItem</li><li>0: Item</li> <li>4: RoofItem</li></ul></p>');


    uxInterface.setWidth(panelWidths);
    uxInterface.setHeight(uxInterfaceHeight);

    settingsViewer2d.setWidth(panelWidths);
    settingsViewer3d.setWidth(panelWidths);


    settingsViewer2d.setHeight(subPanelsHeight);
    settingsViewer3d.setHeight(subPanelsHeight);



    uxInterface.setPosition(app_parent.clientWidth - panelWidths, startY);
    settingsViewer2d.setPosition(app_parent.clientWidth - panelWidths, startY + uxInterfaceHeight);
    settingsViewer3d.setPosition(app_parent.clientWidth - panelWidths, startY + uxInterfaceHeight);


    settingsSelectedCorner.hide();
    settingsSelectedWall.hide();
    settingsSelectedRoom.hide();

    settingsViewer3d.hide();
    settingsSelectedWall3D.hide();
    settingsSelectedRoom3D.hide();
}