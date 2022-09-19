import { Vector2, Vector3,Quaternion,Euler, Plane } from 'three';
import { Matrix4 } from 'three/build/three.module.js';
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

    __fitToWallBounds(point, wallEdge) {
        let point2d = new Vector2(point.x, point.z);
        let wallEdgeVector = wallEdge.interiorEnd().clone().sub(wallEdge.interiorStart());
        let sizeX = this.__halfSize.x + 5;
        let sizeVector = wallEdgeVector.clone().normalize().multiplyScalar(sizeX);
        let positionMinusSize = point2d.clone().sub(sizeVector);
        let positionPlusSize = point2d.clone().add(sizeVector);

        let startToPlusSizeVector = positionPlusSize.sub(wallEdge.interiorStart());
        let endToMinusSizeVector = positionMinusSize.sub(wallEdge.interiorEnd());
        
        if (startToPlusSizeVector.length() > wallEdgeVector.length()) {
            let p = wallEdge.interiorEnd().clone().sub(sizeVector);
            return new Vector3(p.x, point.y, p.y);
        }
        if (endToMinusSizeVector.length() > wallEdgeVector.length()) {
            let p = wallEdge.interiorStart().clone().add(sizeVector);
            return new Vector3(p.x, point.y, p.y);
        }
        return point;
    }

    snapToPoint(point, normal, intersectingPlane, toWall, toFloor, toRoof) {
        this.snapToWall(point, intersectingPlane.wall, intersectingPlane.edge);
    }

    snapToWall(point, wall, wallEdge) {

        super.snapToWall(point, wall, wallEdge);
        let normal = wallEdge.normal;
        let normal2d = new Vector2(normal.x, normal.z);
        let angle = Utils.angle(UP_VECTOR, normal2d);
                
        let plane = new Plane(normal);
        let tempPoint = new Vector3();
        let matrix = new Matrix4();
        matrix.setPosition(wallEdge.center);
        plane.applyMatrix4(matrix);
        plane.projectPoint(point, tempPoint);
        point = tempPoint.clone();
        point = this.__fitToWallBounds(point, wallEdge);
        point = point.clone().add(normal.clone().multiplyScalar(this.halfSize.z));

        
        this.__currentWallNormal = normal.clone();
        this.__currentWallSnapPoint = point.clone();
        this.__addToAWall(wall, wallEdge);
        this.position = point;
        this.rotation = new Vector3(0, angle, 0);
        this.innerRotation=new Vector3(0, angle, 0);
        
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

    __combineRotations() {
        let normal = this.__currentWallNormal;
        if (!this.__currentWallEdge) {
            return new Vector3();
        }
        if (!this.__currentWallNormal) {
            normal = this.__currentWallEdge.normal.clone().normalize();
        }
        let realInnerRotation = new Quaternion().setFromAxisAngle(normal, this.innerRotation.z);
        let quatRotation = new Quaternion().setFromEuler(new Euler(this.rotation.x, this.rotation.y, this.rotation.z));
        let combinedRotation = realInnerRotation.multiply(quatRotation);
        let finalEuler = new Euler().setFromQuaternion(combinedRotation);
        return new Vector3(finalEuler.x, finalEuler.y, finalEuler.z);
    }

    get currentWall(){
        return this.__currentWall;
    }
}