import { InWallItem } from './in_wall_item.js';
import { Vector2, Vector3, Matrix4 } from 'three';
import { UP_VECTOR } from './item.js';
import { Utils } from '../core/utils.js';

/** */
export class InWallFloorItem extends InWallItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane) {
        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
        this.rotation = new Vector3(0, angle, 0);
        point.y = this.halfSize.y + 5;
        this.position = point;
        this.__addToAWall(intersectingPlane);
    }
}