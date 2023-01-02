import { Vector2, Matrix4, Vector3 } from "three";
import { EVENT_MOVED } from "../core/events";

export class CornerGroup {
    /**
     * 
     * @param {Array} array of corners instances
     */
    constructor(corners) {
        this.__corners = corners;
        this.__size = new Vector2();
        this.__center = null;
        this.__currentCenter = new Vector2();
        this.__deltaTranslation = new Vector2();
        this.__radians = 0.0;
        this.__originalCornerPositions = null;
        this.__tl = null;
        this.__br = null;
        this.__tr = null;
        this.__bl = null;
        this.__matrix = new Matrix4();
        this.__cornerMovedEvent = this.__cornerMoved.bind(this);
        this.__addCornerListeners();
        this.__update();
    }

    __cornerMoved() {
        // this.__update();
    }

    __addCornerListeners() {
        for (let i = 0; i < this.__corners.length; i++) {
            this.__corners[i].addEventListener(EVENT_MOVED, this.__cornerMovedEvent);
        }
    }

    __update() {
        this.__originalCornerPositions = [];
        let minPoint = new Vector2(Number.MAX_VALUE, Number.MAX_VALUE);
        let maxPoint = new Vector2(-Number.MAX_VALUE, -Number.MAX_VALUE);

        for (let i = 0; i < this.__corners.length; i++) {
            let corner = this.__corners[i];
            minPoint.x = Math.min(minPoint.x, corner.location.x);
            minPoint.y = Math.min(minPoint.y, corner.location.y);

            maxPoint.x = Math.max(maxPoint.x, corner.location.x);
            maxPoint.y = Math.max(maxPoint.y, corner.location.y);
            this.__originalCornerPositions.push(corner.location.clone());
        }
        this.__minPoint = minPoint.clone();
        this.__maxPoint = maxPoint.clone();
        this.__size = maxPoint.clone().sub(minPoint);
        this.__size.x = Math.abs(this.__size.x);
        this.__size.y = Math.abs(this.__size.y);
        // if (!this.__center) {
        this.__center = this.__size.clone().multiplyScalar(0.5).add(minPoint);
        // }
        this.__currentCenter = this.__size.clone().multiplyScalar(0.5).add(minPoint);
        this.__matrix = this.__matrix.identity();
    }

    __applyTransformations(scale, radians, origin) {
        let translation = origin.clone().sub(this.__center);
        let translationMatrix = new Matrix4().makeTranslation(translation.x, translation.y, 0);

        let T = new Matrix4().makeTranslation(-origin.x, -origin.y, 0); //Translate to -origin of scaling
        let TInv = new Matrix4().makeTranslation(origin.x, origin.y, 0); //Translate to origin of scaling (inverse)

        let rotationMatrix = TInv.clone().multiply(new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), radians)).multiply(T);
        let scaleMatrix = TInv.clone().multiply(new Matrix4().makeScale(scale.x, scale.y, 1)).multiply(T);
        let transformMatrix = rotationMatrix.multiply(scaleMatrix).multiply(translationMatrix);
        let i = 0;
        for (i = 0; i < this.__corners.length; i++) {
            let location = this.__originalCornerPositions[i].clone();
            let location3 = new Vector3(location.x, location.y, 0);
            location3.applyMatrix4(transformMatrix);
            // this.__corners[i].location = new Vector2(location3.x, location3.y);
            this.__corners[i].move(location3.x, location3.y);
        }

        // if (this.__corners[0]) {
        //     this.__corners[0].floorplan.update();
        // }
    }

    applyTransformations(scale, radians, origin) {
        this.__applyTransformations(scale, radians, origin);
    }

    contains(corner) {
        for (let i = 0; i < this.__corners.length; i++) {
            if (corner.id === this.__corners[i].id) {
                return true;
            }
        }
        return false;
        // return Utils.hasValue(this.__corners, corner);
    }

    update() {
        this.__update();
    }

    destroy() {
        for (let i = 0; i < this.__corners.length; i++) {
            this.__corners[i].removeEventListener(EVENT_MOVED, this.__cornerMovedEvent);
        }
        this.__corners = [];
    }

    get matrix() {
        return this.__matrix;
    }

    set matrix(mat){
        this.__matrix = mat;
    }

    get corners() {
        return this.__corners;
    }

    get size() {
        return this.__size.clone();
    }

    get center() {
        return this.__center.clone();
    }

    get boundary(){
        let points = [];
        for (let i =0;i<this.__corners.length;i++){
            let corner = this.__corners[i];
            points.push([corner.location.x, corner.location.y]); 
        }
        return points;
    }

}
export class CornerGroups {
    /**
     * 
     * @param {Floorplan} floorplan
     * @description A class that groups connected corners together and also helps to \
     * to apply transformations on them
     * 
     */
    constructor(floorplan) {
        this.__groups = [];
        this.__floorplan = floorplan;
        this.createGroups();
    }

    getContainingGroup(corner) {
        for (let i = 0; i < this.__groups.length; i++) {
            if (this.__groups[i].contains(corner)) {
                return this.__groups[i];
            }
        }
        return null;
    }

    get groups() {
        return this.__groups;
    }

    /**
     * @description - Determine heuristically the connected group of corners
     */
    createGroups() {
        function tinyCornerGroups(corner, array) {
            let adjacentCorners = corner.adjacentCorners();
            //The below condition means this corner and its neighbors hasn't been analyzed
            if (!array.includes(corner)) {
                array.push(corner);
                for (let j = 0; j < adjacentCorners.length; j++) {
                    array = tinyCornerGroups(adjacentCorners[j], array);
                }
            }
            return array;
        }

        function tinyNotInArray(mainarray, subarray) {
            for (let j = 0; j < mainarray.length; j++) {
                if (!subarray.includes(mainarray[j])) {
                    return mainarray[j];
                }
            }
            return null;
        }
        this.__groups.forEach((group) => {
            group.destroy();
        });
        this.__groups.length = 0;
        if (!this.__floorplan.corners.length) {
            return;
        }

        let firstCorner = this.__floorplan.corners[0];
        let cornerGroups = [
            []
        ];

        cornerGroups[0] = tinyCornerGroups(firstCorner, cornerGroups[0]);

        while (cornerGroups.flat().length !== this.__floorplan.corners.length) {
            let isolatedCorner = tinyNotInArray(this.__floorplan.corners, cornerGroups.flat());
            if (isolatedCorner) {
                let index = cornerGroups.push([]) - 1;
                cornerGroups[index] = tinyCornerGroups(isolatedCorner, cornerGroups[index]);
            } else {
                break;
            }
        }
        for (let i = 0; i < cornerGroups.length; i++) {
            let cornerGroup = new CornerGroup(cornerGroups[i]);
            this.__groups.push(cornerGroup);
        }
    }
}