import { Vector2, Vector3 } from 'three';
import { Utils } from '../core/utils.js';
import { Item, UP_VECTOR } from './item.js';

/**
 * A Wall Item is an entity to be placed related to a wall.
 */
export class WallItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__isWallDependent = true;
        this.__boundToFloor = false;
        this.__allowRotate = false;
        this.__freePosition = false;
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        this.snapToWall(point, intersectingPlane.wall, intersectingPlane.edge);
    }

    snapToWall(point, wall, wallEdge) {
        super.snapToWall(point, wall, wallEdge);
        let normal = wallEdge.normal;

        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
        this.__currentWallNormal = normal.clone();
        this.__currentWallSnapPoint = point.clone();

        point = point.clone().add(normal.clone().multiplyScalar(this.halfSize.z + (wall.thickness * 0.25)));

        this.position = point;
        this.rotation = new Vector3(0, angle, 0);
        this.__addToAWall(wall, wallEdge);
    }

    __parametricGeometryUpdate(evt, updateForWall = true) {
        super.__parametricGeometryUpdate(evt, false);
        if (this.__currentWall && updateForWall) {
            let point = this.__currentWallSnapPoint.clone();
            point = point.clone().add(this.__currentWallNormal.clone().multiplyScalar(this.halfSize.z + (this.__currentWall.thickness * 0.25)));
            this.position = point;
            this.__currentWall.addItem(this);
        }
    }
}