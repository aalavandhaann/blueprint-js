import { EventDispatcher } from "three";
import inside from 'point-in-polygon'
import alpha_shape from 'alpha-shape'

import { EVENT_BOUNDARY_UPDATE, EVENT_EXTERNAL_FLOORPLAN_LOADED } from "../core/events"

export default class Boundary extends EventDispatcher {
    constructor(floorplan, boundaryMetaData = {}) {
        super();
        this.__floorplan = floorplan;
        this.__metadata = { style: { type: 'color', color: '#00FF00', repeat: 50, colormap: null } };
        this.__boundaryRegions = [];
        this.__boundaryRegionsRAW = [];
        this.__roomRegions = [];
        this.__roomRegionsRaw = [];
        this.__externalRegions = [];
        this.__externalRegionsRaw = [];
        this.__width = 1.0;
        this.__height = 1.0;

        this.__externalDesignEvent = this.__externalDesignBoundaries.bind(this);


        for (var opt in this.__metadata) {
            if (this.__metadata.hasOwnProperty(opt) && boundaryMetaData.hasOwnProperty(opt)) {
                this.__metadata[opt] = boundaryMetaData[opt];
            }
        }
        this.__isValid = true;
        this.__floorplan.addEventListener(EVENT_EXTERNAL_FLOORPLAN_LOADED, this.__externalDesignEvent);
    }

    __externalDesignBoundaries(evt) {
        let i = 0;
        let pts = [], ptsraw = [];
        this.__externalRegions = [];
        this.__externalRegionsRaw = [];

        for (i = 0; i < this.__floorplan.externalCorners.length; i++) {
            let c = this.__floorplan.externalCorners[i];
            pts.push(c.location.clone());
            ptsraw.push([c.location.x, c.location.y]);
        }
        let concave_hull = alpha_shape (0.1, ptsraw);
        this.__externalRegionsRaw.push(ptsraw);
        console.log(ptsraw);
        console.log(concave_hull);

    }

    containsPoint(x, y, excludeBoundaryIndex = -1) {
        let flag = (this.__boundaryRegionsRAW.length > 0);
        let i = 0, j = 0;
        for (i = 0; i < this.__boundaryRegionsRAW.length; i++) {
            if (i == excludeBoundaryIndex) {
                continue;
            }
            let pts = this.__boundaryRegionsRAW[i];
            let isInside = inside([x, y], pts);
            flag &= isInside;
        }
        return flag;
    }

    intersectsExternalDesign(x, y) {
        let flag = false;
        let i = 0;
        for (i = 0; i < this.__externalRegionsRaw.length; i++) {
            let pts = this.__externalRegionsRaw[i];
            let isInside = inside([x, y], pts);
            flag |= isInside;
        }
        return flag;
    }

    update() {

    }

    clearBoundaryRegions() {
        this.__boundaryRegions = [];
        this.__boundaryRegionsRAW = []
    }

    addBoundaryRegion(points) {
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;
        let pts = points;
        let ptsraw = [];
        let i = 0;
        for (i = 0; i < pts.length; i++) {
            let point = pts[i];

            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);

            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
            ptsraw.push([point.x, point.y]);
        }

        this.__width = maxX - minX;
        this.__height = maxY - minY;

        this.__boundaryRegions.push(points);
        this.__boundaryRegionsRAW.push(ptsraw);
    }

    get width() {
        return this.__width;
    }

    get height() {
        return this.__height;
    }

    get points() {
        return (this.__boundaryRegions.length) ? this.__boundaryRegions[0] : [];
    }

    get styleRepeat() {
        return this.__metadata.style.repeat;
    }

    /**
     * return if style type is color or texture
     */
    get styleType() {
        return this.__metadata.style.type;
    }

    set styleType(type) {
        this.__metadata.style.type = type;
    }

    get style() {
        return this.__metadata.style;
    }

    /**
     * return a hexacolor string if styleType is color
     * return a path to the ground texture if styleType is texture
     */
    get styleValue() {
        return this.__metadata.style.value;
    }

    set styleValue(value) {
        this.__metadata.style.value = value;
    }

    get isValid() {
        return this.__isValid;
    }


    get metadata() {
        return this.__metadata;
    }

    set metadata(mdata) {
        for (let opt in this.__metadata) {
            if (this.__metadata.hasOwnProperty(opt) && mdata.hasOwnProperty(opt)) {
                this.__metadata[opt] = mdata[opt];
            }
        }
        this.dispatchEvent({ type: EVENT_BOUNDARY_UPDATE, item: this });
    }
}