import { FloorItem } from './floor_item.js';

/** */
export class OnFloorItem extends FloorItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.receiveShadow = true;
    }
}