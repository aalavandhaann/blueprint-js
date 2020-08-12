import { EventDispatcher } from 'three';

import { fabric } from 'fabric';



export class Viewer2D extends EventDispatcher {
    constructor(canvasHolder, floorplan, options) {
        super();
        this.__canvasHolder = canvasHolder;
        this.__floorplan = floorplan;
        this.__options = options;
        this.__canvas = new fabric.Canvas('bp3djs-viewer2d');

        let rect = new fabric.Rect({ left: 100, top: 100, fill: 'blue', width: 20, height: 20 });
        this.__canvas.add(rect);
    }

    __initializeViewerAndEvents() {}

    _zoomViewer() {}

    updateStageSize() {

        var w = window.innerWidth;
        var h = window.innerHeight;

        this._parent.css({ width: window.innerWidth, height: window.innerHeight });

        this.height = h;
        this.width = w;
    }
}