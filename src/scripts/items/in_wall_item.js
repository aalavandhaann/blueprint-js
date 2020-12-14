import { WallItem } from './wall_item.js';
import { Vector2, Vector3 } from 'three';
import { Utils } from '../core/utils.js';
import { UP_VECTOR } from './item.js';
/** */
export class InWallItem extends WallItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        this.snapToWall(point, intersectingPlane.wall, intersectingPlane.edge);
    }

    snapToWall(point, wall, wallEdge) {
        point = this.__fitToWallBounds(point, wallEdge);
        let normal = wallEdge.normal;
        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
        this.rotation = new Vector3(0, angle, 0);
        this.position = point;
        this.__currentWallSnapPoint = point.clone();
        this.__addToAWall(wall, wallEdge);
    }
}