import { EventDispatcher } from "three";
import inside from 'point-in-polygon'

export default class Boundary extends EventDispatcher{
    constructor(floorplan, boundaryMetaData){
        super();
        this.__floorplan = floorplan;
        this.__metadata = {points:[], style: {type: 'color', color: '#00FF00', repeat: 50, colormap: null}};

        for (var opt in this.__metadata) {
            if (this.__metadata.hasOwnProperty(opt) && boundaryMetaData.hasOwnProperty(opt)) {
                this.__metadata[opt] = boundaryMetaData[opt];
            }
        }

        this.__polygonAsArray = null;
        this.__width = 0;
        this.__height = 0;
        this.__isValid = this.__metadata.points.length > 0;

        if(this.__isValid){
            let minX = Number.MAX_VALUE;
            let minY = Number.MAX_VALUE;
            let maxX = -Number.MAX_VALUE;
            let maxY = -Number.MAX_VALUE;
            let pts = this.points;

            for (let i =0;i<pts.length;i++){
                let point = pts[i];

                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);

                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }

            this.__width = maxX - minX;
            this.__height = maxY - minY;

            this.__updatePoints();
        }
    }

    __updatePoints(){
        if(!this.__isValid){
            return;
        }
        let points = this.points;
        this.__polygonAsArray = [];
        for (let i = 0;i<points.length;i++){
            let point = points[i];
            this.__polygonAsArray.push([point.x, point.y]);
        }
    }

    containsPoint(x, y){
        if(!this.__isValid){
            return true;
        }
        return inside([x, y], this.__polygonAsArray);
    }

    get width(){
        return this.__width;
    }

    get height(){
        return this.__height;
    }

    get styleRepeat(){
        return this.__metadata.style.repeat;
    }

    /**
     * return if style type is color or texture
     */
    get styleType(){
        return this.__metadata.style.type;
    }

    set styleType(type){
        this.__metadata.style.type = type;
    }

    get style(){
        return this.__metadata.style;
    }

    /**
     * return a hexacolor string if styleType is color
     * return a path to the ground texture if styleType is texture
     */
    get styleValue(){
        return this.__metadata.style.value;
    }

    set styleValue(value){
        this.__metadata.style.value = value;
    }

    get points(){
        return this.__metadata.points;
    }

    set points(points){
        this.__isValid = false;
        if(!points){
            console.error('Setting invalid type for boundary points');
        }
        this.__metadata.points = points;
        if(points.length){
            this.__isValid = points.length > 0;
        } 
        this.__updatePoints();       
    }

    get isValid(){
        return this.__isValid;
    }
}