import { Layer } from 'konva';


export class Grid extends Layer {
    constructor(viewer2d, options) {
        super({ draggable: true });
        this._options = options;
        this._viewer3d = viewer2d;
    }

    updateGrid() {

    }
}