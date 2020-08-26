import { Vector2, Matrix4, Vector3 } from "three/build/three.module";
import { EVENT_MOVED } from "../core/events";

export class CornerGroup {
    /**
     * 
     * @param {Array} array of corners instances
     */
    constructor(corners) {
        this.__corners = corners;
        this.__size = new Vector2();
        this.__center = new Vector2();
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
        this.__update();
    }

    __addCornerListeners() {
        for (let i = 0; i < this.__corners.length; i++) {
            this.__corners[i].addEventListener(EVENT_MOVED, this.__cornerMovedEvent);
        }
    }

    __update() {
        let minPoint = new Vector2(Number.MAX_VALUE, Number.MAX_VALUE);
        let maxPoint = new Vector2(Number.MIN_VALUE, Number.MIN_VALUE);

        for (let i = 0; i < this.__corners.length; i++) {
            let corner = this.__corners[i];
            minPoint.x = Math.min(minPoint.x, corner.location.x);
            minPoint.y = Math.min(minPoint.y, corner.location.y);

            maxPoint.x = Math.max(maxPoint.x, corner.location.x);
            maxPoint.y = Math.max(maxPoint.y, corner.location.y);
        }

        this.__size = maxPoint.clone().sub(minPoint);
        this.__center = this.__size.clone().multiplyScalar(0.5).add(minPoint);
        this.__tl = minPoint.sub(this.__center);
        this.__br = maxPoint.sub(this.__center);
        this.__tr = new Vector2(this.__br.x, this.__tl.y);
        this.__bl = new Vector2(this.__tl.x, this.__br.y);
        this.__matrix = this.__matrix.identity();
    }

    __applyTransformations(m4) {
        let reset = this.__matrix.clone().getInverse(this.__matrix.clone());
        // this.__applyTransformations(reset);
        console.log('=================================================');
        console.log('APPLY MATRIX 4 ', m4.elements, this.__corners.length);
        for (let i = 0; i < this.__corners.length; i++) {
            let location = this.__corners[i].location;
            let location3 = new Vector3(location.x, location.y, 0);
            location3.applyMatrix4(reset);
            location3 = location3.applyMatrix4(m4);
            this.__corners[i].move(location3.x, location3.y);
            console.log(this.__corners[i].id);
        }
        let tl3 = new Vector3(this.__tl.x, this.__tl.y, 0).applyMatrix4(m4);
        let tr3 = new Vector3(this.__tr.x, this.__tr.y, 0).applyMatrix4(m4);
        let br3 = new Vector3(this.__br.x, this.__br.y, 0).applyMatrix4(m4);
        let bl3 = new Vector3(this.__bl.x, this.__bl.y, 0).applyMatrix4(m4);

        this.__tl.x = tl3.x;
        this.__tl.x = tl3.x;

        this.__tr.x = tr3.x;
        this.__tr.x = tr3.x;

        this.__br.x = br3.x;
        this.__br.x = br3.x;

        this.__bl.x = bl3.x;
        this.__bl.x = bl3.x;
        this.__matrix = m4;
    }

    applyMatrix(matrix4) {
        /**
         * Reset matrix is undo the current matrix
         * for sanity check if you multiply the inverse with itself you should get identity
         */

        // this.__matrix = matrix4;
        this.__applyTransformations(matrix4);
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

    destroy() {
        for (let i = 0; i < this.__corners.length; i++) {
            this.__corners[i].removeEventListener(EVENT_MOVED, this.__cornerMovedEvent);
        }
        this.__corners = [];
    }

    get matrix() {
        return this.__matrix;
    }

    get corners() {
        return this.__corners;
    }

    get tl() {
        return this.__tl;
    }

    get br() {
        return this.__br;
    }

    get size() {
        return this.__size;
    }

    get center() {
        return this.__center;
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