import { Color } from "three";

import {Matrix, Texture} from 'pixi.js';
import { BaseFloorplanViewElement2D } from "./BaseFloorplanViewElement2D";
import { isMobile } from "detect-touch-device";

export class BoundaryView2D extends BaseFloorplanViewElement2D {

    constructor(floorplan, options, boundary) {
        super(floorplan, options);
        
        this.__options['boundary-point-radius'] = 12.5;
        this.__options['boundary-line-thickness'] = 12.5;
        this.__options['boundary-point-color'] = '#000000';
        this.__options['boundary-line-color'] = '#CC33CC';

        for (let opt in options) {
            if (this.__options.hasOwnProperty(opt) && options.hasOwnProperty(opt)) {
                this.__options[opt] = options[opt];
            }
        }

        this.__options['boundary-point-color'] = new Color(this.__options['boundary-point-color']).getHex();
        this.__options['boundary-line-color'] = new Color(this.__options['boundary-line-color']).getHex();

        this.__boundary = boundary;
        this.pivot.x = this.pivot.y = 0.5;

        this.interactive = false;
        this.buttonMode = false;

        this.__drawHoveredOffState();        
    }

    __drawBoundaryRegion(pointsColor, lineColor){
        this.clear();

        if(!this.__boundary.points.length){
            return;
        }

        let alpha = 1.0;//0.1;//
        let fillAlpha = 1.0;
        let radius = this.__options['boundary-point-radius'];
        let thickness = this.__options['boundary-line-thickness'];

        if (isMobile) {
        }
        // console.log('BEFORE ::: ', this.fill, this.__boundary.styleType);
        this.fill.visible = true;
        this.fill.alpha = fillAlpha;

        if(this.__boundary.style.colormap){
            let matrix = new Matrix();
            let scale = Math.min(this.__boundary.width, this.__boundary.height) / this.__boundary.styleRepeat;            
            matrix = matrix.scale(scale, scale);

            let texture = Texture.from(this.__boundary.style.colormap);
            this.fill.texture = texture;
            this.fill.matrix = matrix;
        }
        this.fill.color = new Color(this.__boundary.style.color).getHex();
        
        this.lineStyle(thickness, lineColor);

        for (let i =0;i <= this.__boundary.points.length;i++){
            let index = i % this.__boundary.points.length;
            let cmPoint = this.__boundary.points[index];
            let pixelPoint = this.__vectorToPixels(cmPoint);
            if(i === 0){
                this.moveTo(pixelPoint.x, pixelPoint.y);
            }
            else{
                this.lineTo(pixelPoint.x, pixelPoint.y);
            }
        }
        // this.endFill();

        this.beginFill(pointsColor, alpha);
        for (let i =0;i < this.__boundary.points.length;i++){
            
            let cmPoint = this.__boundary.points[i];
            let pixelPoint = this.__vectorToPixels(cmPoint);
            this.drawCircle(pixelPoint.x, pixelPoint.y, radius);
        }
        this.endFill();

    }
    __drawHoveredOffState() {
        super.__drawHoveredOffState();
        
        this.__drawBoundaryRegion(this.__options['boundary-point-color'], this.__options['boundary-line-color']);
    }

}