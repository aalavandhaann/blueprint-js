import { InWallItem } from './in_wall_item.js';
import { Vector2, Vector3, Matrix4 } from 'three';
import { UP_VECTOR } from './item.js';
import { Utils } from '../core/utils.js';
import { Plane } from 'three/build/three.module.js';

/** */
export class InWallFloorItem extends InWallItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__isBoundToFloor = true;
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        this.snapToWall(point, intersectingPlane.wall, intersectingPlane.edge);
    }

    snapToWall(point, wall, wallEdge) {
        point.y = this.halfSize.y;
        super.snapToWall(point, wall, wallEdge);



        // let normal = wallEdge.normal;
        // let plane = new Plane(normal);
        // let normal2d = new Vector2(normal.x, normal.z);
        // let angle = Utils.angle(UP_VECTOR, normal2d);
        

        // let tempPoint = new Vector3();
        // let matrix = new Matrix4();
        
        // matrix.setPosition(wallEdge.center);
        // plane.applyMatrix4(matrix);
        // plane.projectPoint(point, tempPoint);
        // point = tempPoint.clone();
        // point = point.clone().sub(normal.clone().multiplyScalar(wall.thickness * 0.5));
        // point = this.__fitToWallBounds(point, wallEdge);

        // point.y = this.halfSize.y;
        // this.rotation = new Vector3(0, angle, 0);
        // this.innerRotation=new Vector3(0, angle, 0);

        // this.position = point;
        // this.__currentWallSnapPoint = point.clone();
        // this.__currentWallNormal = normal.clone();
        // this.__addToAWall(wall, wallEdge);
    }

    __parametricGeometryUpdate(evt, updateForWall = true) {
        super.__parametricGeometryUpdate(evt, false);
        if (this.__currentWall && updateForWall) {
            let currentPosition = this.position.clone();
            currentPosition.y = this.halfSize.y + 5;
            this.position = currentPosition;
            this.__currentWall.addItem(this);
        }
    }
}