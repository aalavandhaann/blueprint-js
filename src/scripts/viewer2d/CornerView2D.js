import { BaseFloorplanViewElement2D } from './BaseFloorplanViewElement2D.js';
import { Dimensioning } from '../core/dimensioning.js';
import { EVENT_MOVED } from '../core/events.js';
import { Point } from 'pixi.js';
import { Configuration, snapTolerance, snapToGrid } from '../core/configuration.js';


export class CornerView2D extends BaseFloorplanViewElement2D {
    constructor(floorplan, options, corner) {
        super(floorplan, options);
        this.__corner = corner;
        this.pivot.x = this.pivot.y = 0.5;
        this.__cornerUpdateEvent = this.__updateWithModel.bind(this);

        this.__drawHoveredOffState();

        this.__corner.addEventListener(EVENT_MOVED, this.__cornerUpdateEvent);
        this.__updateWithModel();
    }

    __drawCornerState(radius, borderColor, fillColor) {
        this.clear();
        this.beginFill(borderColor);
        this.drawCircle(0, 0, radius);
        this.endFill();
        this.beginFill(fillColor);
        this.drawCircle(0, 0, radius * 0.55);
        this.endFill();
    }

    __drawSelectedState() {
        super.__drawSelectedState();
        let radius = this.__options['corner-radius'];
        this.__drawCornerState(radius, 0x04A9F5, 0x049995);
    }
    __drawHoveredOnState() {
        super.__drawHoveredOnState();
        let radius = this.__options['corner-radius'] * 1.0;
        this.__drawCornerState(radius, 0x000000, 0x04A9F5);
    }
    __drawHoveredOffState() {
        super.__drawHoveredOffState();
        let radius = this.__options['corner-radius'];
        this.__drawCornerState(radius, 0xCCCCCC, 0x000000);
    }

    __updateWithModel() {
        let xx = Dimensioning.cmToPixel(this.__corner.location.x);
        let yy = Dimensioning.cmToPixel(this.__corner.location.y);
        this.position.x = xx;
        this.position.y = yy;
    }

    __dragMove(evt) {
        super.__dragMove(evt);
        if (this.__isDragging) {
            let co = evt.data.getLocalPosition(this.parent);
            let cmCo = new Point(co.x, co.y);
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);

            if (Configuration.getNumericValue(snapToGrid) || this.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }


            this.__corner.move(cmCo.x, cmCo.y);
        }
    }

    remove() {
        this.__corner.removeEventListener(EVENT_MOVED, this.__cornerUpdateEvent);
        super.remove();
    }


    removeFromFloorplan() {
        this.remove();
        this.__corner.removeAll();
    }
}