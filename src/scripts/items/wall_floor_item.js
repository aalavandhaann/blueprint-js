import { WallItem } from './wall_item.js';
/** */
export class WallFloorItem extends WallItem {
    constructor(model, metadata, geometry, material, position, rotation, scale, isgltf = false) {
        super(model, metadata, geometry, material, position, rotation, scale, isgltf);
        this.boundToFloor = true;
    }
}