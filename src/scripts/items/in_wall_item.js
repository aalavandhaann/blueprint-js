import { WallItem } from './wall_item.js';
import { Matrix4, Vector2, Vector3 } from 'three';
import { Utils } from '../core/utils.js';
import { UP_VECTOR } from './item.js';
import { Plane } from 'three/build/three.module.js';
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
        let normal = wallEdge.normal;
        let plane = new Plane(normal);
        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
        let tempPoint = new Vector3();
        let matrix = new Matrix4();
        
        matrix.setPosition(wallEdge.center);
        plane.applyMatrix4(matrix);
        plane.projectPoint(point, tempPoint);
        point = tempPoint.clone();
        point = this.__fitToWallBounds(point, wallEdge);

        this.rotation = new Vector3(0, angle, 0);
        this.innerRotation=new Vector3(0, angle, 0);
        this.position = point;
        this.__currentWallSnapPoint = point.clone();
        this.__addToAWall(wall, wallEdge);
    }
}