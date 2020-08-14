import { InWallItem } from './in_wall_item.js';

/** */
export class InWallFloorItem extends InWallItem {
    constructor(model, metadata, geometry, material, position, rotation, scale, isgltf = false) {
        super(model, metadata, geometry, material, position, rotation, scale, isgltf);
        this.boundToFloor = true;
    }
}