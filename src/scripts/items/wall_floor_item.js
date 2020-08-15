import { WallItem } from './wall_item.js';
/** */
export class WallFloorItem extends WallItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__boundToFloor = true;
    }
}