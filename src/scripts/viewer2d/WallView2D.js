import { BaseFloorplanViewElement2D } from './BaseFloorplanViewElement2D.js';
import { EVENT_MOVED, EVENT_UPDATED, EVENT_DELETED } from '../core/events.js';
import { Dimensioning } from '../core/dimensioning.js';
import { Graphics, Text } from 'pixi.js';
import { Vector3, Vector2, Color } from 'three';
import { Configuration, snapToGrid, snapTolerance, dragOnlyX, dragOnlyY, directionalDrag } from '../core/configuration.js';

export class WallDimensions2D extends Graphics {
    constructor(floorplan, options, wall) {
        super();
        var opts = { dimlinecolor: '#3EDEDE', dimarrowcolor: '#000000', dimtextcolor: '#000000', };
        for (var opt in opts) {
            if (opts.hasOwnProperty(opt) && options.hasOwnProperty(opt)) {
                opts[opt] = options[opt];
            }
        }
        opts.dimlinecolor = new Color(opts.dimlinecolor).getHex();
        opts.dimarrowcolor = new Color(opts.dimarrowcolor).getHex();
        opts.dimtextcolor = new Color(opts.dimtextcolor).getHex();

        this.__floorplan = floorplan;
        this.__options = opts;
        this.__wall = wall;
        this.__textfield = new Text('Length: ', { fontFamily: 'Arial', fontSize: 14, fill: this.__options.dimtextcolor, align: 'center' });
        this.__textfield.anchor.set(0.5, 0.5);
        this.interactive = this.__textfield.interactive = false;
        this.addChild(this.__textfield);
        this.update();
    }

    __getPolygon(start, radius, sides, rotation = 0.0) {
        let points = [];
        for (let i = 0; i < sides; i++) {
            let theta = (i / sides) * Math.PI * 2.0;
            let xx = (Math.sin(theta + rotation) * radius) + start.x;
            let yy = (Math.cos(theta + rotation) * radius) + start.y;
            points.push(new Vector2(xx, yy));
        }

        return points;
    }

    __wallNormal() {
        if (this.__wall.attachedRooms.length) {
            return this.__wall.attachedRooms[0].getWallOutDirection(this.__wall);
        }
        let wallDirectionNormalized2D = this.__wall.wallDirectionNormalized();
        let wallDirectionNormalized = new Vector3(wallDirectionNormalized2D.x, wallDirectionNormalized2D.y, 0);
        wallDirectionNormalized.applyAxisAngle(new Vector3(0, 0, 1), 1.57);
        return wallDirectionNormalized;
    }

    __wallOffsetLocation(point2d, offset = 20) {
        let wallOutDirection = this.__wallNormal();
        if (wallOutDirection == null) {
            wallOutDirection = new Vector3(0, 1, 0);
        }
        let bestLocation = point2d.add(wallOutDirection.multiplyScalar(offset));
        return this.__toPixels(bestLocation);
    }

    __wallOffsetLocationFromCenter(offset = 20) {
        let wallCenter2D = this.__wall.wallCenter().clone();
        let bestLocation = this.__wallOffsetLocation(wallCenter2D, offset); //wallCenter.add(wallOutDirection.multiplyScalar(offset));
        return bestLocation;
    }

    __toPixels(vector) {
        vector.x = Dimensioning.cmToPixel(vector.x);
        vector.y = Dimensioning.cmToPixel(vector.y);
        return vector;
    }

    __drawDimensionLine() {
        let wallDirectionNormalized = this.__wall.wallDirectionNormalized();
        let wallAngle = this.__wall.wallDirectionNormalized().angle();
        let p1Start = this.__toPixels(this.__wall.start.location.clone());
        let p1End = this.__wallOffsetLocation(this.__wall.start.location.clone(), 100);

        let p2Start = this.__toPixels(this.__wall.end.location.clone());
        let p2End = this.__wallOffsetLocation(this.__wall.end.location.clone(), 100);

        let p1Center = this.__wallOffsetLocation(this.__wall.start.location.clone(), 50);
        let p2Center = this.__wallOffsetLocation(this.__wall.end.location.clone(), 50);
        //Draw the line at wall start
        this.clear();
        this.lineStyle(2, this.__options.dimlinecolor);

        this.moveTo(p1Start.x, p1Start.y);
        this.lineTo(p1End.x, p1End.y);

        this.moveTo(p2Start.x, p2Start.y);
        this.lineTo(p2End.x, p2End.y);

        this.moveTo(p1Center.x, p1Center.y);
        this.lineTo(p2Center.x, p2Center.y);


        let radius = 5;
        let p4 = p1Center.add(wallDirectionNormalized.clone().multiplyScalar(radius));
        let p5 = p2Center.sub(wallDirectionNormalized.clone().multiplyScalar(radius));

        let arrow1 = this.__getPolygon(p4, radius, 4, wallAngle + 1.57);
        let arrow2 = this.__getPolygon(p5, radius, 4, wallAngle + 1.57);
        let i = 0;
        this.beginFill(this.__options.dimarrowcolor, 1.0);
        this.moveTo(arrow1[0].x, arrow1[0].y);
        for (i = 1; i < arrow1.length; i++) {
            this.lineTo(arrow1[i].x, arrow1[i].y);
        }
        this.lineTo(arrow1[0].x, arrow1[0].y);

        this.moveTo(arrow2[0].x, arrow2[0].y);
        for (i = 1; i < arrow2.length; i++) {
            this.lineTo(arrow2[i].x, arrow2[i].y);
        }
        this.lineTo(arrow2[0].x, arrow2[0].y);
        this.endFill();

        // this.__textfield.rotation = -wallAngle;
    }

    __updateDimensionText() {
        let location = this.__wallOffsetLocationFromCenter(100);
        this.__textfield.text = Dimensioning.cmToMeasure(this.__wall.wallSize);
        this.__textfield.position.x = location.x;
        this.__textfield.position.y = location.y;
    }

    update() {
        this.__drawDimensionLine();
        this.__updateDimensionText();
    }

}

export class WallView2D extends BaseFloorplanViewElement2D {
    constructor(floorplan, options, wall) {
        super(floorplan, options);
        this.__options = options;
        this.__wall = wall;
        this.__wallUpdatedEvent = this.__drawUpdatedWall.bind(this);
        this.__wallDeletedEvent = this.remove.bind(this);
        this.__info = new WallDimensions2D(floorplan, options, wall);
        this.viewDimensions = false;
        this.addChild(this.__info);

        this.__wall.addEventListener(EVENT_MOVED, this.__wallUpdatedEvent);
        this.__wall.addEventListener(EVENT_UPDATED, this.__wallUpdatedEvent);
        this.__wall.addEventListener(EVENT_DELETED, this.__wallDeletedEvent);
        this.__mouseOut();
    }

    get viewDimensions() {
        return (this.__info.alpha > 0.9);
    }

    set viewDimensions(value) {
        if (value) {
            this.__info.alpha = 1.0;
            return;
        }
        this.__info.alpha = 0.15;
    }

    __getCornerCoordinates() {
        let sPoint = this.__wall.start.location.clone();
        let ePoint = this.__wall.end.location.clone();
        sPoint.x = Dimensioning.cmToPixel(sPoint.x);
        sPoint.y = Dimensioning.cmToPixel(sPoint.y);
        ePoint.x = Dimensioning.cmToPixel(ePoint.x);
        ePoint.y = Dimensioning.cmToPixel(ePoint.y);
        return [sPoint, ePoint];
    }

    __getPolygonCoordinates() {
        let edge = (this.__wall.frontEdge !== null) ? this.__wall.frontEdge : (this.__wall.backEdge !== null) ? this.__wall.backEdge : null;
        if (edge === null) {
            return [];
        }
        let points = [edge.exteriorStart(), edge.exteriorEnd(), edge.interiorEnd(), edge.interiorStart()];
        for (let i = 0; i < points.length; i++) {
            points[i].x = Dimensioning.cmToPixel(points[i].x);
            points[i].y = Dimensioning.cmToPixel(points[i].y);
        }
        return points;
    }

    __drawPolygon(color = 0xDDDDDD, alpha = 1.0) {
        let points = this.__getPolygonCoordinates();
        this.clear();
        this.beginFill(color, alpha);
        for (let i = 0; i < points.length; i++) {
            let pt = points[i];
            if (i === 0) {
                this.moveTo(pt.x, pt.y);
            } else {
                this.lineTo(pt.x, pt.y);
            }
        }
        this.endFill();

        let cornerLine = this.__getCornerCoordinates();
        this.lineStyle(1, 0xFFFFFF);
        this.moveTo(cornerLine[0].x, cornerLine[0].y);
        this.lineTo(cornerLine[1].x, cornerLine[1].y);
    }

    get selected() {
        return super.selected;
    }

    set selected(flag) {
        super.selected = flag;
        this.viewDimensions = flag;
    }

    __drawSelectedState() {
        this.__drawPolygon(0x049995, 1.0);
    }
    __drawHoveredOnState() {
        this.__drawPolygon(0x04A9F5, 1.0);
    }
    __drawHoveredOffState() {
        this.__drawPolygon(0x000000, 1.0);
    }

    __dragMove(evt) {
        super.__dragMove(evt);
        if (this.__isDragging) {
            let co = evt.data.getLocalPosition(this.parent);
            let cmCo = new Vector2(co.x, co.y);
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || this.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }

            if (Configuration.getBooleanValue(directionalDrag)) {
                let projected = this.__wall.projectOnWallPlane(cmCo);
                let vectorToProjected = cmCo.clone().sub(projected);

                if (Configuration.getBooleanValue(snapToGrid) || this.__snapToGrid) {
                    let snappedLength = Math.floor(vectorToProjected.length() / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                    vectorToProjected = vectorToProjected.normalize().multiplyScalar(snappedLength);
                }
                let finalCo = this.__wall.location.clone().add(vectorToProjected);
                cmCo = finalCo;
            }

            if (Configuration.getBooleanValue(dragOnlyX) && !Configuration.getBooleanValue(dragOnlyY)) {
                cmCo.y = this.__wall.location.y;
            }

            if (!Configuration.getBooleanValue(dragOnlyX) && Configuration.getBooleanValue(dragOnlyY)) {
                cmCo.x = this.__wall.location.x;
            }

            // this.__wall.move(cmCo.x, cmCo.y);
            this.__wall.location = cmCo; //new Vector2(cmCo.x, cmCo.y);
            evt.stopPropagation();
        }
    }

    __drawUpdatedWall(evt) {
        this.__info.update();
        this.viewDimensions = true;
        if (this.selected) {
            this.__drawSelectedState();
            return;
        }
        this.__drawHoveredOffState();

    }

    remove() {
        this.__wall.removeEventListener(EVENT_MOVED, this.__wallUpdatedEvent);
        this.__wall.removeEventListener(EVENT_UPDATED, this.__wallUpdatedEvent);
        this.__wall.removeEventListener(EVENT_DELETED, this.__wallDeletedEvent);
        this.removeChild(this.__info);
        super.remove();
    }

    removeFromFloorplan() {
        this.remove();
        this.__wall.remove();
        this.__wall = null;
    }
}