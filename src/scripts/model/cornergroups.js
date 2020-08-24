import { Utils } from "../core/utils";
import { Matrix3, Vector2 } from "three/build/three.module";

export class CornerGroup {
    /**
     * 
     * @param {Array} array of corners instances
     */
    constructor(corners) {
        this.__corners = corners;
        this.__size = new Vector2();
        this.__center = new Vector2();
        this.__tl = new Vector2();
        this.__br = new Vector2();
    }

    /**
     * update is quite a costly function. Call this explicitly
     */
    update() {
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
        this.__corners = [];
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
        this.update();
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
    update() {
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