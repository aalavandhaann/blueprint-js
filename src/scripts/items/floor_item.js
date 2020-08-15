import { Item } from './item.js';

/**
 * A Floor Item is an entity to be placed related to a floor.
 */
export class FloorItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this._freePosition = false;
    }

    get position() {
        return this.__position;
    }
    set position(p) {
        p.y = this.position.y;
        super.position = p;
    }

    // /** */
    // placeInRoom() {
    //     if (!this.position_set) {
    //         var center = this.__model.floorplan.getCenter();
    //         this.position.x = center.x;
    //         this.position.z = center.z;
    //         this.position.y = 0.5 * (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y);
    //     }
    // }
}