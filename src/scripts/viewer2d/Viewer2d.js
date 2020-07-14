import $ from 'jquery';
import { Stage } from 'konva/lib/Core';

import { Grid2D } from './Grid2d.js';

export class Viewer2D extends Stage {
    constructor(canvasHolder, floorplan, options) {
        super({ container: canvasHolder, draggable: false });
        this._floorplan = floorplan;
        this._options = options;
        this._scaleBy = (this._options.scaleBy) ? this._options.scaleBy : 1.5;
        this._parent = $('#' + this.canvasHolder);

        this.__initializeViewerAndEvents();
    }

    __initializeViewerAndEvents() {
        let scope = this;
        this._gridElement = new Grid2D(this, this._options);
        this.add(this._gridElement);

        this.on('wheel', (e) => this._zoomViewer(e));
        $(window).resize(() => scope.updateStageSize());
        scope.updateStageSize();
    }

    _zoomViewer(e) {
        e.evt.preventDefault();
        let prevScaleX = this.stageX();
        var pointer = this.getPointerPosition();

        var mousePointTo = {
            x: (pointer.x - this.x()) / prevScaleX,
            y: (pointer.y - this.y()) / prevScaleX,
        };

        var newScale =
            e.evt.deltaY > 0 ? prevScaleX * this._scaleBy : prevScaleX / this._scaleBy;

        this.scale({ x: newScale, y: newScale });

        var newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };
        this.position(newPos);
        this.batchDraw();
    }

    updateStageSize() {

        var w = window.innerWidth;
        var h = window.innerHeight;

        this._parent.css({ width: window.innerWidth, height: window.innerHeight });

        this.height = h;
        this.width = w;
        this._gridElement.updateGrid();

        this.draw();
    }
}