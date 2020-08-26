import { Graphics, utils as pixiutils, Matrix } from "pixi.js";
import Corner from "../model/corner";
import Wall from "../model/wall";
import Room from "../model/room";
import { Dimensioning } from "../core/dimensioning";
import { Matrix4, Vector3, Vector2, EventDispatcher, Quaternion } from "three";
import { Utils } from "../core/utils";

class CornerGroupScalePoint extends Graphics {
    constructor(index, parameters) {
        super();
        var opts = { radius: 10, outerColor: 0x00FF00, innerColor: '#FFFF00', move: { x: 1, y: 1 }, offset: { x: -0.5, y: -0.5 } };
        if (parameters) {
            for (var opt in opts) {
                if (opts.hasOwnProperty(opt) && parameters.hasOwnProperty(opt)) {
                    opts[opt] = parameters[opt];
                }
                if (opt === 'outerColor' || opt === 'innerColor') {
                    opts[opt] = pixiutils.string2hex(opts[opt]);
                }
            }
        }
        this.id = Utils.guide();
        this.__index = index;
        this.__isDragged = false;
        this.__center = new Vector2();
        this.__size = new Vector2();
        this.__parameters = opts;
        this.__opposite = null;
        this.__eventDispatcher = new EventDispatcher();

        this.__mouseUpEvent = this.__dragEnd.bind(this);
        this.__mouseMoveEvent = this.__dragMove.bind(this);
        this.__mouseOverEvent = this.__mouseOver.bind(this);
        this.__mouseOutEvent = this.__mouseOut.bind(this);
        this.__mouseDownEvent = this.__mouseDown.bind(this);


        this.on('mousedown', this.__mouseDownEvent).on('touchstart', this.__mouseDownEvent);
        this.on('mouseupoutside', this.__mouseUpEvent).on('touchendoutside', this.__mouseUpEvent);
        this.on('mouseup', this.__mouseUpEvent).on('touchend', this.__mouseUpEvent);
        this.on('mousemove', this.__mouseMoveEvent).on('touchmove', this.__mouseMoveEvent);
        this.on('mouseover', this.__mouseOverEvent).on('mouseout', this.__mouseOutEvent);

        this.interactive = true;
        this.buttonMode = true;
        this.__drawPoint();
    }

    __drawPoint() {
        this.clear();
        let hitRadius = this.__parameters.radius * 3;
        let borderRadius = this.__parameters.radius * 2;
        let radius = this.__parameters.radius;

        this.beginFill(0x00000, 0.1);
        this.drawRect(-hitRadius * 0.5, -hitRadius * 0.5, hitRadius, hitRadius);

        this.beginFill(this.__parameters.outerColor, 1.0);
        this.drawRect(-borderRadius * 0.5, -borderRadius * 0.5, borderRadius, borderRadius);

        this.beginFill(this.__parameters.innerColor, 1.0);
        this.drawRect(-radius * 0.5, -radius * 0.5, radius, radius);
    }

    __mouseDown(evt) {
        evt.stopPropagation();
        this.__isDragged = true;
        let co = evt.data.getLocalPosition(this.parent);
        this.__eventDispatcher.dispatchEvent({ type: 'DragStart', position: co, handle: this, opposite: this.opposite });
    }

    __mouseOver(evt) {
        evt.stopPropagation();
    }

    __mouseOut(evt) {
        evt.stopPropagation();
    }

    __dragEnd(evt) {
        evt.stopPropagation();
        this.__isDragged = false;
        let co = evt.data.getLocalPosition(this.parent);
        this.__eventDispatcher.dispatchEvent({ type: 'DragEnd', position: co, handle: this, opposite: this.opposite });
    }

    __dragMove(evt) {
        if (this.__isDragged) {
            evt.stopPropagation();
            let co = evt.data.getLocalPosition(this.parent);
            if (this.move.x && !this.move.y || (this.move.y && !this.move.x)) {
                let mousePosition = new Vector2(co.x, co.y);
                let start = new Vector2(this.position.x, this.position.y);
                let end = new Vector2(this.opposite.position.x, this.opposite.position.y);
                let vect = end.clone().sub(start);
                let mouse2Start = mousePosition.sub(start);
                co = vect.normalize().multiplyScalar(mouse2Start.length());
            }
            this.__eventDispatcher.dispatchEvent({ type: 'DragMove', position: co, handle: this, opposite: this.opposite });
        }
    }

    updateCenterAndSize(center, size) {
        let xOffset = (size.x * this.__parameters.offset.x);
        let yOffset = (size.y * this.__parameters.offset.y);
        this.position.x = xOffset + center.x;
        this.position.y = yOffset + center.y;
    }

    addFloorplanListener(type, listener) {
        this.__eventDispatcher.addEventListener(type, listener);
    }

    removeFloorplanListener(type, listener) {
        this.__eventDispatcher.removeEventListener(type, listener);
    }

    get index() {
        return this.__index;
    }

    get opposite() {
        return this.__opposite;
    }
    set opposite(oppose) {
        this.__opposite = oppose;
    }

    get move() {
        return this.__parameters.move;
    }

    get offset() {
        return this.__parameters.offset;
    }
}

export class CornerGroupTransform2D extends Graphics {
    constructor(floorplan, parameters) {
        super();
        var opts = { scale: true, rotate: true, translate: true };
        if (parameters) {
            for (var opt in opts) {
                if (opts.hasOwnProperty(opt) && parameters.hasOwnProperty(opt)) {
                    opts[opt] = parameters[opt];
                }
            }
        }
        this.__parameters = opts;
        this.__floorplan = floorplan;
        this.__groups = this.__floorplan.cornerGroups;
        this.__currentGroup = null;
        this.__transformOrigin = new Vector3();

        this.__currentRadians = 0.0;
        this.__currentWidth = 100;
        this.__currentHeight = 100;

        this.__currentScaleMatrix = new Matrix4();
        this.__currentRotationMatrix = new Matrix4();
        this.__currentTranslationMatrix = new Matrix4();

        this.__originalPositions = [];
        this.__size = null;
        this.__center = null;
        this.__scalingHandles = [];
        this.__scaleHandleDragStartEvent = this.__scaleHandleDragStart.bind(this);
        this.__scaleHandleDragEndEvent = this.__scaleHandleDragEnd.bind(this);
        this.__scaleHandleDragMoveEvent = this.__scaleHandleDragMove.bind(this);
        if (this.__parameters.scale) {
            this.__createScalingHandles();
        }

        this.__tempDebugIndex = 0;
    }

    /**
     * array of handles
     * 0 starts from tl and goes clockwise to index each handle (total 8 handles)
     * top-left handle will be at 0th index,
     * mid-top handle will be at 1th index,
     * top-right handle will be at 2nd index,
     * mid-right handle will be at 3rd index,
     * bottom-right handle will be at 4th index,
     * mid-bottom handle will be at 5th index,
     * bottom-left handle will be at 6th index,
     * mid-left will be at 7th index,
     * all mid handles are in the odd index
     */
    __createScalingHandles() {
        let i = 0;
        let totalHandles = 8;
        let xTransform = 1;
        let yTransform = 0;
        let xOffsets = [-0.5, 0.0, 0.5, 0.5, 0.5, 0, -0.5, -0.5];
        let yOffsets = [-0.5, -0.5, -0.5, 0.0, 0.5, 0.5, 0.5, -0.0];
        for (; i < totalHandles; i++) {
            let xMove = 1;
            let yMove = 1;
            if (i % 2 === 1) {
                xTransform = Number(!xTransform);
                yTransform = Number(!yTransform);
                xMove = xTransform;
                yMove = yTransform;
            }
            let handle = new CornerGroupScalePoint(i, { move: { x: xMove, y: yMove }, offset: { x: xOffsets[i], y: yOffsets[i] } });
            handle.addFloorplanListener('DragStart', this.__scaleHandleDragStartEvent);
            handle.addFloorplanListener('DragEnd', this.__scaleHandleDragEndEvent);
            handle.addFloorplanListener('DragMove', this.__scaleHandleDragMoveEvent);
            this.addChild(handle);
            this.__scalingHandles.push(handle);
        }

        for (i = 0; i < totalHandles; i++) {
            let handle = this.__scalingHandles[i];
            let oppositeIndex = (i + 4) % totalHandles;
            handle.opposite = this.__scalingHandles[oppositeIndex];
        }
    }

    __applyAllTransformsMatrix() {
        let allTransformsMatrix = this.__currentRotationMatrix.clone().multiply(this.__currentScaleMatrix).multiply(this.__currentTranslationMatrix);

    }

    __applyRotationMatrix(radians, originPoint, apply = true) {
        let originForRotation = new Vector3(originPoint.x, originPoint.y, 0);
        let originTRotation = new Matrix4().makeTranslation(-originForRotation.x, -originForRotation.y, 0);
        let originTInverseRotation = new Matrix4().makeTranslation(originForRotation.x, originForRotation.y, 0);

        let rotation = new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), radians);
        let transformMatrix = originTInverseRotation.clone().multiply(rotation.multiply(originTRotation));
        let reset = this.__currentRotationMatrix.clone().getInverse(this.__currentRotationMatrix); //.multiply(this.__currentRotationMatrix);

        if (apply) {
            for (let i = 0; i < this.__scalingHandles.length; i++) {
                let handle2 = this.__scalingHandles[i];
                let usePosition = handle2.position.clone();
                let p3 = new Vector3(usePosition.x, usePosition.y, 0);
                p3.applyMatrix4(reset);
                p3.applyMatrix4(transformMatrix);
                handle2.position.x = p3.x;
                handle2.position.y = p3.y;
            }
            this.__currentRotationMatrix = transformMatrix;
        }
        return transformMatrix;
    }

    /**
     * 
     * @param {Number} newWidth - An absolute value( no negative)
     * @param {*} newHeight - An absolute value( no negative) 
     */
    __applyScalingMatrix(newWidth, newHeight, originPoint) {
        let originForScale = new Vector3(originPoint.x, originPoint.y, 0);
        let scale = new Vector2(newWidth / this.__currentWidth, newHeight / this.__currentHeight);

        let originTScale = new Matrix4().makeTranslation(-originForScale.x, -originForScale.y, 0);
        let originTInverseScale = new Matrix4().makeTranslation(originForScale.x, originForScale.y, 0);

        let scaling = new Matrix4().makeScale(scale.x, scale.y, 1);
        let transformMatrix = originTInverseScale.clone().multiply(scaling.multiply(originTScale));
        let reset = this.__currentScaleMatrix.clone().getInverse(this.__currentScaleMatrix); //.multiply(this.__currentRotationMatrix);

        this.__currentWidth = newWidth;
        this.__currentHeight = newHeight;

        for (let i = 0; i < this.__scalingHandles.length; i++) {
            let handle2 = this.__scalingHandles[i];
            let usePosition = handle2.position.clone();
            let p3 = new Vector3(usePosition.x, usePosition.y, 0);
            // p3.applyMatrix4(reset);
            p3.applyMatrix4(transformMatrix);
            handle2.position.x = p3.x;
            handle2.position.y = p3.y;
        }
        this.__currentScaleMatrix = transformMatrix;
        return transformMatrix;
    }


    __scaleHandleDragStart(evt) {
        this.__tempDebugIndex += 1;
    }

    __scaleHandleDragMove(evt) {
        let co = new Vector2(evt.position.x, evt.position.y);
        let handle = evt.handle;
        let opposite = evt.opposite;

        let start = new Vector3(co.x, co.y, 0);
        let end = new Vector3(opposite.position.x, opposite.position.y, 0);


        start = start.applyMatrix4(this.__currentRotationMatrix);
        end = end.applyMatrix4(this.__currentRotationMatrix);

        let vect = end.clone().sub(start);

        let originForScale = new Vector3(end.x, end.y, 0);
        vect.x = (handle.move.x) ? Math.abs(vect.x) : this.__currentWidth;
        vect.y = (handle.move.y) ? Math.abs(vect.y) : this.__currentHeight;

        // this.__applyScalingMatrix(Math.abs(vect.x), Math.abs(vect.y), originForScale);

        let radians = Math.atan2(co.y - this.__center.y, co.x - this.__center.x);
        let matrix = this.__applyRotationMatrix(radians, this.__center);
        let floorplanMatrix = this.__applyRotationMatrix(radians, this.__currentGroup.center, false);
        this.__currentGroup.applyMatrix(floorplanMatrix);


    }

    __scaleHandleDragEnd(evt) {

    }


    __setRadians(angle) {
        this.__currentRadians = angle;
        this.__rotateHandle.x = Math.cos(angle) * this.__ringRadius;
        this.__rotateHandle.y = Math.sin(angle) * this.__ringRadius;
    }

    __toPixels(vector) {
        vector.x = Dimensioning.cmToPixel(vector.x);
        vector.y = Dimensioning.cmToPixel(vector.y);
        return vector;
    }

    __setScalingHandlesPosition() {
        if (this.__parameters.scale) {
            for (let i = 0; i < this.__scalingHandles.length; i++) {
                let handle = this.__scalingHandles[i];
                handle.updateCenterAndSize(this.__center, this.__size);
                this.__originalPositions.push(new Vector2(handle.position.x, handle.position.y));
            }
        }
    }

    __updateTransformControls() {
        this.__currentScale = new Vector2(1, 1);
        this.__size = this.__toPixels(this.__currentGroup.size.clone());
        this.__center = this.__toPixels(this.__currentGroup.center.clone());
        this.__matrix = this.__currentGroup.matrix.clone();

        this.__setScalingHandlesPosition();

        this.__currentWidth = this.__size.x;
        this.__currentHeight = this.__size.y;

        this.__currentScaleMatrix = this.__applyScalingMatrix(this.__currentWidth, this.__currentHeight, this.__center);
        this.__currentRotationMatrix = this.__applyRotationMatrix(0, this.__center);

        // this.__applyAllTransformsMatrix();

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