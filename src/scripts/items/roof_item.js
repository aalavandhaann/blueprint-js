import { Item } from './item.js';
import { Matrix4, Triangle, Plane, Vector3 } from 'three';
/**
 * A Floor Item is an entity to be placed related to a floor.
 */
export class RoofItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__customIntersectionPlanes = this.__model.floorplan.roofPlanesForIntersection;
        this.__boundToRoof = true;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        point.y -= this.halfSize.y;
        this.position = point;
    }
}