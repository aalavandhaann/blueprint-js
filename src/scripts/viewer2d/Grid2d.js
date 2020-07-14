import { Layer } from 'konva/lib/Layer';
import { Line } from 'konva/lib/shapes/Line';

import { Dimensioning } from '../core/dimensioning.js';
import { Configuration, gridSpacing } from '../core/configuration.js';

export class Grid2D extends Layer {
    constructor(viewer2d, options) {
        super({ draggable: true });
        this._options = options;
        this._viewer2d = viewer2d;
        this._gridlines = [];
        this.updateGrid();
    }

    _clearLines() {
        let i = 0;
        for (; i < this._gridlines.length; i++) {
            this.remove(this._gridlines[i]);
        }
    }

    updateGrid() {
        var gspacing = Dimensioning.cmToPixel(Configuration.getNumericValue(gridSpacing));
        let infinity = 20000;
        let deltaX = infinity - this.viewer2d.width;
        let deltaY = infinity - this.viewer2d.height;
        let deltaXHalf = deltaX * 0.5;
        let deltaYHalf = deltaY * 0.5;

        let sx = -deltaXHalf;
        let sy = -deltaYHalf;

        this._clearLines();

        for (var x = 0; x <= (infinity / gspacing); x++) {
            let px = x + sx;
            let line = new Line({ points: [0, 0, px, infinity], stroke: '#ddd', strokeWidth: 0.5 });
            this.add(line);
            this._gridlines.push(line);
        }
        for (var y = 0; y <= (infinity / gspacing); y++) {
            let py = y + sy;
            let line = new Line({ points: [0, 0, infinity, py], stroke: '#ddd', strokeWidth: 0.5 });
            this.add(line);
            this._gridlines.push(line);
        }

    }
}