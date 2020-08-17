import { BlueprintJS } from './scripts/blueprint.js';
import { EVENT_LOADED } from './scripts/core/events.js';
import { Configuration, configDimUnit } from './scripts/core/configuration.js';
import { dimMeter } from './scripts/core/constants.js';
import QuickSettings from 'quicksettings';
import { ConfigurationHelper } from './scripts/helpers/ConfigurationHelper.js';

let panelWidths = 200;
let uxInterfaceHeight = 225;
let empty = '{"floorplan":{"version":"0.0.2a","units":"m", "corners":{"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":0,"y":0,"elevation":2.5},"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":0,"y":5,"elevation":2.5},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":5,"y":5,"elevation":2.5},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":5,"y":0,"elevation":2.5}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":-176.77669529663686,"y":176.7766952966369},"b":{"x":-176.7766952966369,"y":323.22330470336317}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":176.7766952966369,"y":676.7766952966368},"b":{"x":323.22330470336317,"y":676.776695296637}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":676.7766952966368,"y":323.2233047033631},"b":{"x":676.776695296637,"y":176.77669529663686}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"wallType":"STRAIGHT","a":{"x":323.2233047033631,"y":-176.77669529663686},"b":{"x":176.77669529663686,"y":-176.7766952966369}}],"rooms":{"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2,4e3d65cb-54c0-0681-28bf-bddcc7bdb571,da026c08-d76a-a944-8e7b-096b752da9ed,f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"name":"Ashok\'s Room"}},"wallTextures":[],"floorTextures":{},"newFloorTextures":{},"carbonSheet":{"url":"","transparency":1,"x":0,"y":0,"anchorX":0,"anchorY":0,"width":0.01,"height":0.01}},"items":[{"id":"7d0b3e90-c315-e7a5-a6d9-594757d5b7e4","itemName":"An Item","itemType":2,"position":[0,0,0],"rotation":[0,0,0],"scale":[1,1,1],"size":[240,50,100],"fixed":true,"resizable":true, "modelURL":"models/Cube.glb"}, {"itemName":"Lantern","itemType":9,"position":[10,0,0],"rotation":[0,0,0],"scale":[1,1,1],"size":[240,50,100],"fixed":false,"resizable":false, "modelURL":"models/Cube.glb"}, {"itemName":"Lantern","itemType":4,"position":[10,0,0],"rotation":[0,0,0],"scale":[1,1,1],"size":[240,50,100],"fixed":false,"resizable":false, "modelURL":"models/Cube.glb"}]}';


let blueprint3d = null;

let configurationHelper = new ConfigurationHelper();

let settingsViewer2d = null;
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

function switchViewer() {
    blueprint3d.switchView();
    if (blueprint3d.currentView === 2) {
        uxInterface.setValue("Current View", "Floor Planning");
        settingsViewer3d.hide();
        settingsViewer2d.show();
    } else if (blueprint3d.currentView === 3) {
        uxInterface.setValue("Current View", "Room Planning");
        settingsViewer2d.hide();
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
blueprint3d.model.addEventListener(EVENT_LOADED, function() { console.log('LOAD SERIALIZED JSON ::: '); });
blueprint3d.model.loadSerialized(empty);


uxInterface = QuickSettings.create(0, 0, 'BlueprintJS');
settingsViewer2d = QuickSettings.create(0, 0, 'Viewer 2D');
settingsViewer3d = QuickSettings.create(0, 0, 'Viewer 3D');
uxInterface.addButton('Switch Viewer', switchViewer);
uxInterface.addHTML('Current View', 'Floorplanning');

uxInterface.addFileChooser("Load Design", "Load Design", ".blueprint3d", loadBlueprint3DDesign);
uxInterface.addButton('Save Design', saveBlueprint3DDesign);

settingsViewer2d.bindBoolean('snapToGrid', configurationHelper.snapToGrid, configurationHelper);
settingsViewer2d.bindBoolean('directionalDrag', configurationHelper.directionalDrag, configurationHelper);
settingsViewer2d.bindBoolean('dragOnlyX', configurationHelper.dragOnlyX, configurationHelper);
settingsViewer2d.bindBoolean('dragOnlyY', configurationHelper.dragOnlyY, configurationHelper);
settingsViewer2d.bindNumber('boundsX', 1, 200, configurationHelper.boundsX, 1, configurationHelper);
settingsViewer2d.bindNumber('boundsY', 1, 200, configurationHelper.boundsY, 1, configurationHelper);
settingsViewer2d.bindRange('snapTolerance', 1, 200, configurationHelper.snapTolerance, 1, configurationHelper);
settingsViewer2d.bindRange('gridSpacing', 10, 200, configurationHelper.gridSpacing, 1, configurationHelper);

settingsViewer2d.addButton('Draw Mode', switchViewer2DToDraw);
settingsViewer2d.addButton('Move Mode', switchViewer2DToMove);

settingsViewer3d.addHTML('Tips:', '<p>Click and drag to rotate the room in 360\xB0</p><p>Add room items (Coming soon)</p><p>Drag and Place items(pink boxes) in the room</p><p>There are 8 different types of items <ul><li>1: FloorItem</li> <li>2: WallItem</li> <li>3: InWallItem</li> <li>7: InWallFloorItem</li> <li>8: OnFloorItem</li> <li>9: WallFloorItem</li><li>0: Item</li> <li>4: RoofItem</li></ul></p>');


uxInterface.setWidth(panelWidths);
settingsViewer2d.setWidth(panelWidths);
settingsViewer3d.setWidth(panelWidths);

uxInterface.setHeight(uxInterfaceHeight);

uxInterface.setPosition(document.getElementById('bp3d-js-app').clientWidth - panelWidths, 0);
settingsViewer2d.setPosition(document.getElementById('bp3d-js-app').clientWidth - panelWidths, uxInterfaceHeight);
settingsViewer3d.setPosition(document.getElementById('bp3d-js-app').clientWidth - panelWidths, uxInterfaceHeight);

settingsViewer3d.hide();

// });