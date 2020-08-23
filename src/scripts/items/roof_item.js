import { Item } from './item.js';
import { Matrix4, Triangle, Plane, Vector3 } from 'three';
/**
 * A Floor Item is an entity to be placed related to a floor.
 */
export class RoofItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__customIntersectionPlanes = this.__model.floorplan.roofPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        point.y -= this.halfSize.y + 5;
        this.position = point;
    }
}