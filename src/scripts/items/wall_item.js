import { Vector2, Vector3 } from 'three';
import { EVENT_DELETED } from '../core/events.js';
import { Utils } from '../core/utils.js';
import { Item, UP_VECTOR } from './item.js';

/**
 * A Wall Item is an entity to be placed related to a wall.
 */
export class WallItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__boundToFloor = false;
        this.__allowRotate = false;
        this.__freePosition = false;
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane) {
        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
        let rotatedSize = this.halfSize.clone();
        rotatedSize.applyAxisAngle(UP_VECTOR, angle);
        // The below needs to done so the size is always positive
        // The rotation of size might lead to negative values based on the angle of rotation
        rotatedSize.x = Math.abs(rotatedSize.x);
        rotatedSize.y = Math.abs(rotatedSize.y);
        rotatedSize.z = Math.abs(rotatedSize.z);
        point = point.clone().add(normal.clone().multiplyScalar(this.halfSize.z + (intersectingPlane.edge.wall.thickness * 0.25)));
        this.position = point;
        this.rotation = new Vector3(0, angle, 0);
    }
}