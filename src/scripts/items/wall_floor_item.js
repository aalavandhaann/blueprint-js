import { WallItem } from './wall_item.js';
import { Matrix4, Plane, Vector2, Vector3 } from 'three';
import { Utils } from '../core/utils.js';
import { UP_VECTOR } from './item.js';
/** */
export class WallFloorItem extends WallItem {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__boundToFloor = true;
        this.__customIntersectionPlanes = this.__model.floorplan.wallPlanesForIntersection;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        //Disabling line 15 prevents total movement
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
        point = point.clone().add(normal.clone().multiplyScalar(this.halfSize.z + (wall.thickness * 0)));
        point.y = this.halfSize.y + 5;
        
        this.__currentWallNormal = normal.clone();
        this.__currentWallSnapPoint = point.clone();
        
        this.rotation = new Vector3(0, angle, 0);
        this.innerRotation=new Vector3(0, angle, 0);
        this.position = point;
        this.__addToAWall(wall, wallEdge);
    }

    __parametricGeometryUpdate(evt, updateForWall = true) {
        super.__parametricGeometryUpdate(evt, false);
        if (this.__currentWall && updateForWall) {
            let point = this.__currentWallSnapPoint.clone();
            point = point.clone().add(this.__currentWallNormal.clone().multiplyScalar(this.halfSize.z + (this.__currentWall.thickness * 0.25)));
            point.y = this.halfSize.y + 5;
            this.position = point;
            this.__currentWall.addItem(this);
        }
    }
}