import { Graphics, Texture } from "pixi.js";
import Corner from "../model/corner";
import Wall from "../model/wall";
import Room from "../model/room";
import { Dimensioning } from "../core/dimensioning";
import { Matrix4, Vector3 } from "three";

class CornerGroupTransformBallView2D extends Graphics {
    constructor(parameters) {
        super();
        var opts = { radius: 10, outerColor: '#00FF00', innerColor: '#FFFFFF', };
        if (parameters) {
            for (var opt in opts) {
                if (opts.hasOwnProperty(opt) && parameters.hasOwnProperty(opt)) {
                    opts[opt] = parameters[opt];
                }
            }
        }
        this.interactive = true;
        this.buttonMode = true;
        this.__radius = opts.radius;
        this.__outerColor = opts.outerColor;
        this.__innerColor = opts.innerColor;
        this.__drawGradientBall();
    }

    __drawGradientBall() {
        this.lineStyle(5, 0x000000, 0.7, 0.5);
        this.drawCircle(this.__radius, this.__radius, this.__radius);
        this.lineStyle(3, 0xFFFFFF, 0.7, 0.5);
        this.drawCircle(this.__radius, this.__radius, this.__radius);
        this.beginTextureFill(this.__getGradientTexture(this.__outerColor, this.__innerColor, this.__radius));
        this.drawCircle(this.__radius, this.__radius, this.__radius);
        this.pivot.set(this.__radius);
    }

    __getGradientTexture(fromColor, toColor, radius) {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        const x = radius;
        const y = radius;
        const xOffset = radius * 0.4;
        const yOffset = -radius * 0.4;
        // Create gradient
        const grd = ctx.createRadialGradient(x, y, radius, x + xOffset, y + yOffset, radius * 0.1);
        grd.addColorStop(0, fromColor);
        grd.addColorStop(1, toColor);

        // Fill with gradient
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        return new Texture.from(c);
    }
}

export class CornerGroupTransform2D extends Graphics {
    constructor(floorplan) {
        super();
        this.__floorplan = floorplan;
        this.__groups = this.__floorplan.cornerGroups;
        this.__rotateHandle = new CornerGroupTransformBallView2D();
        this.__selected = null;
        this.__currentGroup = null;
        this.__size = null;
        this.__center = null;
        this.__tl = null;
        this.__br = null;
        this.__ringRadius = 0;
        this.__isDragging = false;
        this.__currentRadians = 0.0;

        this.__mouseDownEvent = this.__dragStart.bind(this);
        this.__mouseUpEvent = this.__dragEnd.bind(this);
        this.__mouseMoveEvent = this.__dragMove.bind(this);
        this.__mouseOverEvent = this.__mouseOver.bind(this);
        this.__mouseOutEvent = this.__mouseOut.bind(this);
        this.__mouseClickEvent = this.__click.bind(this);

        this.__rotateHandle.on('mousedown', this.__mouseClickEvent).on('touchstart', this.__mouseClickEvent);
        this.__rotateHandle.on('mouseupoutside', this.__mouseUpEvent).on('touchendoutside', this.__mouseUpEvent);
        this.__rotateHandle.on('mouseup', this.__mouseUpEvent).on('touchend', this.__mouseUpEvent);
        this.__rotateHandle.on('mousemove', this.__mouseMoveEvent).on('touchmove', this.__mouseMoveEvent);
        this.__rotateHandle.on('mouseover', this.__mouseOverEvent).on('mouseout', this.__mouseOutEvent);
        this.addChild(this.__rotateHandle);
    }

    __click(evt) {
        this.__isDragging = true;
        if (evt !== undefined) {
            evt.stopPropagation();
        }
    }

    __mouseOver(evt) {}

    __mouseOut(evt) {
        if (evt !== undefined) {
            evt.stopPropagation();
        }
    }
    __dragStart(evt) {
        this.__isDragging = true;
        evt.stopPropagation();
    }

    __dragEnd(evt) {
        this.__isDragging = false;
        evt.stopPropagation();
    }

    __dragMove(evt) {
        if (this.__isDragging) {
            let co = evt.data.getLocalPosition(this.parent);
            let angle = Math.atan2(co.y, co.x);
            this.__currentRadians = angle;
            this.__rotateHandle.x = Math.cos(angle) * this.__ringRadius;
            this.__rotateHandle.y = Math.sin(angle) * this.__ringRadius;
            this.__drawTransformation();
            evt.stopPropagation();
        }
    }

    __toPixels(vector) {
        vector.x = Dimensioning.cmToPixel(vector.x);
        vector.y = Dimensioning.cmToPixel(vector.y);
        return vector;
    }

    __drawRotationRing() {
        // this.clear();
        this.lineStyle(20, 0x000000, 0.7, 0.5);
        this.drawCircle(0, 0, this.__ringRadius);
        this.lineStyle(10, 0xFFFFFF, 0.7, 0.5);
        this.drawCircle(0, 0, this.__ringRadius);
        this.lineStyle(5, 0x007070, 0.7, 0.5);
        this.drawCircle(0, 0, this.__ringRadius);
    }

    __drawTransformation() {
        let m = new Matrix4();
        m.makeRotationAxis(new Vector3(0, 0, 1), this.__currentRadians);

        let rotatedTL = new Vector3(this.__tl.x, this.__tl.y, 0).applyMatrix4(m);
        let rotatedTR = new Vector3(this.__br.x, this.__tl.y, 0).applyMatrix4(m);

        let rotatedBR = new Vector3(this.__br.x, this.__br.y, 0).applyMatrix4(m);
        let rotatedBL = new Vector3(this.__tl.x, this.__br.y, 0).applyMatrix4(m);

        this.clear();
        this.beginFill(0xCCCCCC, 0.4);
        this.moveTo(rotatedTL.x, rotatedTL.y);
        this.lineTo(rotatedTR.x, rotatedTR.y);
        this.lineTo(rotatedBR.x, rotatedBR.y);
        this.lineTo(rotatedBL.x, rotatedBL.y);
        this.endFill();
        this.__drawRotationRing();

    }

    __updateTransformControls() {
        this.__currentGroup.update();

        this.__size = this.__toPixels(this.__currentGroup.size.clone());
        this.__center = this.__toPixels(this.__currentGroup.center.clone());
        this.__tl = this.__toPixels(this.__currentGroup.tl.clone());
        this.__br = this.__toPixels(this.__currentGroup.br.clone());
        this.__ringRadius = Math.max(this.__size.x, this.__size.y);

        this.position.x = this.__center.x;
        this.position.y = this.__center.y;


        this.__rotateHandle.position.x = Math.cos(0) * this.__ringRadius;
        this.__rotateHandle.position.y = Math.sin(0) * this.__ringRadius;
        this.__drawTransformation();
    }

    get selected() {
        return this.__selected;
    }
    set selected(instanceOfCornerOrWallOrRoom) {
        this.__selected = instanceOfCornerOrWallOrRoom;
        if (this.__selected) {
            let corner = null;
            if (instanceOfCornerOrWallOrRoom instanceof Corner) {
                corner = instanceOfCornerOrWallOrRoom;
            } else if (instanceOfCornerOrWallOrRoom instanceof Wall) {
                corner = instanceOfCornerOrWallOrRoom.start;
            } else if (instanceOfCornerOrWallOrRoom instanceof Room) {
                corner = instanceOfCornerOrWallOrRoom.corners[0];
            } else {
                throw new Error('selected  can assigned with a Corner, Wall, Room or null. Unrecogonized datatype');
            }
            this.__currentGroup = this.__groups.getContainingGroup(corner);

            this.__updateTransformControls();
        }
    }
}