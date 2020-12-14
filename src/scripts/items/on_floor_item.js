import { FloorItem } from './floor_item.js';
import { Item } from './item.js';

/** */
export class OnFloorItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.receiveShadow = true;
        this.__customIntersectionPlanes = this.__model.floorplan.floorPlanesForIntersection;
    }
}