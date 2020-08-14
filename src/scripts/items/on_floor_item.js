import { FloorItem } from './floor_item.js';

/** */
export class OnFloorItem extends FloorItem {
    constructor(model, metadata, geometry, material, position, rotation, scale, isgltf = false) {
        super(model, metadata, geometry, material, position, rotation, scale, isgltf);
        this.obstructFloorMoves = false;
        this.receiveShadow = true;
    }
}