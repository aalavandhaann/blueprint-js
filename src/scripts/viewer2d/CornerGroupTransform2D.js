import { Graphics, utils as pixiutils, Text, Ticker, Texture, Sprite } from "pixi.js";
import Corner from "../model/corner";
import Wall from "../model/wall";
import Room from "../model/room";
import { Dimensioning } from "../core/dimensioning";
import { Matrix4, Vector3, Vector2, EventDispatcher, Quaternion } from "three";
import { Utils } from "../core/utils";
import { Configuration, snapToGrid, snapTolerance } from "../core/configuration";


class CornerGroupRectangle extends Graphics {
    constructor(floorplan, size, center) {
        super();
        this.__floorplan = floorplan;
        this.__size = size.clone();
        this.__center = center.clone();
        let halfSize = this.__size.clone().multiplyScalar(0.5);
        this.__tl = this.__center.clone().sub(halfSize);
        this.__br = this.__center.clone().add(halfSize);
        this.__tr = new Vector2(this.__br.x, this.__tl.y);
        this.__bl = new Vector2(this.__tl.x, this.__br.y);

        this.__vertices = [this.__tl, this.__tr, this.__br, this.__bl];

        this.__originalSize = this.__size.clone();
        this.__originalCenter = this.__center.clone();
        this.__currentRadians = 0;

        this.__currentScaleMatrix = new Matrix4(); //Keeps track of the absolute scaling
        this.__currentRotationMatrix = new Matrix4(); //Keeps track of the absolute rotation
        this.__currentTranslationMatrix = new Matrix4(); //Keeps track of translation

        this.__drawRectangle();
        this.__ticker = Ticker.shared;
        // this.__ticker.add(this.__tick, this);
    }

    translateByPosition(position) {
        let translateMatrix = new Matrix4().makeTranslation(position.x, position.y, 0);
        let finalPoints = [];
        for (let i = 0; i < this.__vertices.length; i++) {
            //Reset current Scaling
            let co2 = this.__vertices[i].clone();
            let co = new Vector3(co2.x, co2.y, 0);
            // co = co.applyMatrix4(this.__currentRotationMatrix.clone().getInverse(this.__currentRotationMatrix.clone()));
            co = co.applyMatrix4(translateMatrix);
            
            if(this.__floorplan.boundary){
                if(this.__floorplan.boundary.containsPoint(Dimensioning.pixelToCm(co.x), Dimensioning.pixelToCm(co.y))){
                    return;
                }
                if(this.__floorplan.boundary.intersectsExternalDesign(Dimensioning.pixelToCm(co.x), Dimensioning.pixelToCm(co.y))){
                    return;
                }
            }
            finalPoints.push(co);
        }   

        for (let i =0;i < finalPoints.length;i++){
            let co = finalPoints[i];
            this.__vertices[i].x = co.x;
            this.__vertices[i].y = co.y;
        }



        this.__center.y = this.__tr.y - this.__tl.y;
        this.__size.x = this.__tl.clone().sub(this.__tr).length();
        this.__size.y = this.__tl.clone().sub(this.__bl).length();
        this.__center = this.__br.clone().sub(this.__tl).multiplyScalar(0.5).add(this.__tl);
        let delta = this.__center.clone().sub(this.__originalCenter);
        this.__currentTranslationMatrix = new Matrix4().makeTranslation(delta.x, delta.y, 0);
        this.__drawRectangle();
    }

    rotateByRadians(radians) {
        let finalPoints = [];
        let T = new Matrix4().makeTranslation(-this.__center.x, -this.__center.y, 0);
        let TInv = new Matrix4().makeTranslation(this.__center.x, this.__center.y, 0);

        let rotationMatrix = new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), radians);
        let rotationAboutOrigin = TInv.clone().multiply(rotationMatrix).multiply(T);

        let resetRotation = new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), -this.__currentRadians);
        let resetRotationAboutOrigin = TInv.clone().multiply(resetRotation).multiply(T);

        for (let i = 0; i < this.__vertices.length; i++) {
            //Reset current Scaling
            let co2 = this.__vertices[i].clone();
            let co = new Vector3(co2.x, co2.y, 0);
            // co = co.applyMatrix4(this.__currentRotationMatrix.clone().getInverse(this.__currentRotationMatrix.clone()));
            co = co.applyMatrix4(resetRotationAboutOrigin);
            co = co.applyMatrix4(rotationAboutOrigin);


            if(this.__floorplan.boundary){
                if(this.__floorplan.boundary.containsPoint(Dimensioning.pixelToCm(co.x), Dimensioning.pixelToCm(co.y))){
                    return;
                }
                if(this.__floorplan.boundary.intersectsExternalDesign(Dimensioning.pixelToCm(co.x), Dimensioning.pixelToCm(co.y))){
                    return;
                }
            }
            finalPoints.push(co);
        }


        for (let i =0;i < finalPoints.length;i++){
            let co = finalPoints[i];
            this.__vertices[i].x = co.x;
            this.__vertices[i].y = co.y;
        }


        this.__currentRotationMatrix = rotationAboutOrigin.clone();
        this.__currentRadians = radians;
        // this.__center.x = this.__tr.x - this.__tl.x;
        this.__center.y = this.__tr.y - this.__tl.y;
        this.__size.x = this.__tl.clone().sub(this.__tr).length();
        this.__size.y = this.__tl.clone().sub(this.__bl).length();
        this.__center = this.__br.clone().sub(this.__tl).multiplyScalar(0.5).add(this.__tl);
        this.__drawRectangle();
    }

    scaleBySize(newWidth, newHeight, origin) {

        let finalPoints = [];

        let scale = new Vector2(newWidth / this.__size.x, newHeight / this.__size.y);
        //Origin - The origin about which transformations happen
        let T = new Matrix4().makeTranslation(-origin.x, -origin.y, 0); //Translate to -origin of scaling
        let TInv = new Matrix4().makeTranslation(origin.x, origin.y, 0); //Translate to origin of scaling (inverse)


        let rotation = new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), this.__currentRadians); //Calculate the current rotation matrix
        let scaleMatrix = new Matrix4().makeScale(scale.x, scale.y, 1); //Calculate the relative scaling to apply

        let scaleAboutOrigin = TInv.clone().multiply(scaleMatrix).multiply(T); //Now scale about the origin. This matrix has no rotation so scaling along x,y
        let rotateAboutOrigin = TInv.clone().multiply(rotation).multiply(T); //Now rotate about the origin. 
        let resetRotationAboutOrigin = rotateAboutOrigin.clone().getInverse(rotateAboutOrigin.clone()); //Ensure to reset the rotation of currentRadians

        /**
         * The final transformation matrix is composition of matrices from right to left
         * 1- So the first thing is reset the current rotation, 
         * 2- Then apply scaling along normal x,y axis, 
         * 3 -Finally apply the current rotation 
         */
        let transformMatrix = rotateAboutOrigin.clone().multiply(scaleAboutOrigin).multiply(resetRotationAboutOrigin);

        for (let i = 0; i < this.__vertices.length; i++) {
            let co2 = this.__vertices[i].clone();
            let co = new Vector3(co2.x, co2.y, 0);
            co = co.applyMatrix4(transformMatrix);

            if(this.__floorplan.boundary){
                if(this.__floorplan.boundary.containsPoint(Dimensioning.pixelToCm(co.x), Dimensioning.pixelToCm(co.y))){
                    return;
                }
                if(this.__floorplan.boundary.intersectsExternalDesign(Dimensioning.pixelToCm(co.x), Dimensioning.pixelToCm(co.y))){
                    return;
                }
            }
            finalPoints.push(co);
            // this.__vertices[i].x = co.x;
            // this.__vertices[i].y = co.y;
        }


        for (let i =0;i < finalPoints.length;i++){
            let co = finalPoints[i];
            this.__vertices[i].x = co.x;
            this.__vertices[i].y = co.y;
        }

        this.__size.x = newWidth; //this.__tl.clone().sub(this.__tr).length();
        this.__size.y = newHeight; //this.__tl.clone().sub(this.__bl).length();
        this.__center = this.__br.clone().sub(this.__tl).multiplyScalar(0.5).add(this.__tl);

        let delta = this.__center.clone().sub(this.__originalCenter);
        this.__currentRotationMatrix = rotation.clone();
        this.__currentScaleMatrix = this.__currentScaleMatrix.multiply(scaleMatrix);
        this.__currentTranslationMatrix = new Matrix4().makeTranslation(delta.x, delta.y, 0);

        this.__drawRectangle();
    }

    __tick() {
        console.log('TICK TICK TICK');
    }

    __drawRectangle() {
        this.clear();
        this.beginFill(0xCCCCCC, 0.5);
        this.moveTo(this.__tl.x, this.__tl.y);
        this.lineTo(this.__tr.x, this.__tr.y);
        this.lineTo(this.__br.x, this.__br.y);
        this.lineTo(this.__bl.x, this.__bl.y);
        this.endFill();

        // this.beginFill(0xFF0000, 1.0);
        // this.drawCircle(this.__center.x, this.__center.y, 10);
        // this.endFill();
    }

    destroy() {
        this.__ticker.remove(this.__tick, this);
        this.__ticker.destroy();
    }

    get tl() {
        return this.__tl;
    }

    get tr() {
        return this.__tr;
    }

    get br() {
        return this.__br;
    }

    get bl() {
        return this.__bl;
    }

    get size() {
        return this.__size;
    }

    get center() {
        return this.__center;
    }

    get rotationMatrix() {
        return this.__currentRotationMatrix.clone();
    }

    get scalingMatrix() {
        return this.__currentScaleMatrix;
    }

    get translationMatrix() {
        return this.__currentTranslationMatrix;
    }

    get rotationRadians() {
        return this.__currentRadians;
    }

    get origin() {
        return this.__center;
    }

    get matrix4() {
        let scale = new Vector3().setFromMatrixScale(this.__currentScaleMatrix);
        let rotation = new Quaternion().setFromRotationMatrix(this.__currentRotationMatrix);
        let translation = new Vector3().setFromMatrixPosition(this.__currentTranslationMatrix);
        let sMatrix = new Matrix4().makeScale(scale.x, scale.y, 1);
        let rMatrix = new Matrix4().makeRotationFromQuaternion(rotation);
        let tMatrix = new Matrix4().makeTranslation(translation.x, translation.y, translation.z);
        return rMatrix.multiply(sMatrix).multiply(tMatrix);
    }
}


class CornerGroupTransformationPoint extends Sprite {
    constructor(svg = 'icons/rotateGroup.svg') {
        super(new Texture.from(svg));
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
        this.scale.set(0.05, 0.05);
        this.anchor.set(0.5);
    }

    __mouseDown(evt) {
        evt.stopPropagation();
        this.__isDragged = true;
        let co = evt.data.getLocalPosition(this.parent);
        this.__eventDispatcher.dispatchEvent({ type: 'DragStart', position: co, handle: this });
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
        this.__eventDispatcher.dispatchEvent({ type: 'DragEnd', position: co, handle: this });
    }

    __dragMove(evt) {
        if (this.__isDragged) {
            evt.stopPropagation();
            let snapping = Configuration.getBooleanValue(snapToGrid);
            let co = evt.data.getLocalPosition(this.parent);

            if (snapping) {
                co.x = Math.floor(co.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                co.y = Math.floor(co.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }
            this.__eventDispatcher.dispatchEvent({ type: 'DragMove', position: co, handle: this });
        }
    }

    addFloorplanListener(type, listener) {
        this.__eventDispatcher.addEventListener(type, listener);
    }

    removeFloorplanListener(type, listener) {
        this.__eventDispatcher.removeEventListener(type, listener);
    }
}
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
        this.__parameters.move = new Vector2(opts.move.x, opts.move.y);
        this.__opposite = null;
        this.__matrix4 = new Matrix4();
        this.__eventDispatcher = new EventDispatcher();

        this.__textfield = new Text(this.__index, { fontFamily: 'Arial', fontSize: 12, fill: 0x000000, align: 'center' });
        this.__textfield.pivot.x = 3;
        this.__textfield.pivot.y = 6;

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

        this.addChild(this.__textfield);
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
            let snapping = Configuration.getBooleanValue(snapToGrid);
            let co = evt.data.getLocalPosition(this.parent);

            if (snapping) {
                co.x = Math.floor(co.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                co.y = Math.floor(co.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
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

    get location() {
        return new Vector2(this.position.x, this.position.y);
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

    get matrix4() {
        return this.__matrix4;
    }

    set matrix4(mat) {
        this.__matrix4 = mat.clone();
    }
}

export class CornerGroupTransform2D extends Graphics {
    constructor(floorplan, parameters) {
        super();
        let opts = { scale: true, rotate: true, translate: true };
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
        this.__cornerPointer = null;
        this.__isActive = false;


        this.__originalPositions = [];
        this.__size = null;
        this.__center = null;
        this.__scalingHandles = [];
        this.__rotateHandle = new CornerGroupTransformationPoint();
        this.__translateHandle = new CornerGroupTransformationPoint('icons/translateGroup.svg');

        this.__resizer = null;


        this.__scaleHandleDragStartEvent = this.__scaleHandleDragStart.bind(this);
        this.__scaleHandleDragEndEvent = this.__scaleHandleDragEnd.bind(this);
        this.__scaleHandleDragMoveEvent = this.__scaleHandleDragMove.bind(this);

        this.__rotateHandleDragStartEvent = this.__rotateHandleDragStart.bind(this);
        this.__rotateHandleDragEndEvent = this.__rotateHandleDragEnd.bind(this);
        this.__rotateHandleDragMoveEvent = this.__rotateHandleDragMove.bind(this);



        if (this.__parameters.scale) {
            this.__createScalingHandles();
        }
        if (this.__parameters.rotate) {
            this.__rotateHandle.addFloorplanListener('DragStart', this.__rotateHandleDragStartEvent);
            this.__rotateHandle.addFloorplanListener('DragMove', this.__rotateHandleDragMoveEvent);
            this.__rotateHandle.addFloorplanListener('DragEnd', this.__rotateHandleDragEndEvent);
            this.addChild(this.__rotateHandle);
        }
        if (this.__parameters.translate) {
            this.__translateHandle.addFloorplanListener('DragStart', this.__rotateHandleDragStartEvent);
            this.__translateHandle.addFloorplanListener('DragMove', this.__rotateHandleDragMoveEvent);
            this.__translateHandle.addFloorplanListener('DragEnd', this.__rotateHandleDragEndEvent);
            this.addChild(this.__translateHandle);
        }
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
        let resizerIndices = [0, -1, 1, -1, 2, -1, 3, -1];
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
            handle.extraIndex = resizerIndices[i];
            handle.opposite = this.__scalingHandles[oppositeIndex];
        }
    }


    __scaleHandleDragStart(evt) {

    }

    __scaleHandleDragMove(evt) {
        this.__isActive = true;
        let co = new Vector3(evt.position.x, evt.position.y, 0);
        let handle = evt.handle;
        let opposite = evt.opposite;
        let opposite3 = new Vector3(opposite.location.x, opposite.location.y, 0);
        let vect = opposite3.clone().sub(co);
        let sizeX = this.__resizer.size.x;
        let sizeY = this.__resizer.size.y;
        if (handle.move.x && handle.move.y) {
            let hVect = null;
            let vVect = null;
            let co2 = new Vector2(evt.position.x, evt.position.y);
            switch (handle.extraIndex) {
                case 0:
                    hVect = co2.clone().sub(this.__resizer.tr.clone());
                    vVect = co2.clone().sub(this.__resizer.bl.clone());
                    break;
                case 1:
                    hVect = co2.clone().sub(this.__resizer.tl.clone());
                    vVect = co2.clone().sub(this.__resizer.br.clone());
                    break;
                case 2:
                    hVect = co2.clone().sub(this.__resizer.bl.clone());
                    vVect = co2.clone().sub(this.__resizer.tr.clone());
                    break;
                default:
                    hVect = co2.clone().sub(this.__resizer.br.clone());
                    vVect = co2.clone().sub(this.__resizer.tl.clone());
                    break;
            }
            sizeX = hVect.length(); //vect.length(); //
            sizeY = vVect.length(); //vect.length(); //
        } else if (handle.move.x) {
            sizeX = vect.length();
        } else if (handle.move.y) {
            sizeY = vect.length();
        }
        this.__resizer.scaleBySize(sizeX, sizeY, opposite.location);
        this.__setControlsPosition();
    }

    __scaleHandleDragEnd(evt) {
        if (!this.__isActive) {
            return;
        }
        // let matrix = this.__resizer.scalingMatrix.clone().multiply(this.__resizer.rotationMatrix);
        this.__setControlsPosition();
        this.__updateMatrixOfGroup();
        this.__isActive = false;
    }

    __rotateHandleDragStart(evt) {

    }

    __rotateHandleDragMove(evt) {
        this.__isActive = true;
        let handle = evt.handle;
        if (handle === this.__rotateHandle) {
            let co = new Vector2(evt.position.x, evt.position.y);
            let vect = co.sub(this.__resizer.center);
            let radians = Math.atan2(vect.y, vect.x);
            this.__resizer.rotateByRadians(radians);
        } else if (handle === this.__translateHandle) {
            let co = new Vector2(evt.position.x, evt.position.y);
            let delta = co.sub(this.__resizer.center);
            this.__resizer.translateByPosition(delta);
        }
        this.__setControlsPosition();
    }

    __rotateHandleDragEnd(evt) {
        if (!this.__isActive) {
            return;
        }
        this.__setControlsPosition();
        this.__updateMatrixOfGroup();
        this.__isActive = false;
    }

    __updateMatrixOfGroup() {
        let matrix = this.__resizer.matrix4;
        let scale = new Vector3().setFromMatrixScale(matrix);
        this.__currentGroup.applyTransformations(scale, this.__resizer.rotationRadians, this.__toUnits(this.__resizer.origin.clone()));
        // let newMatrix = this.__currentGroup.matrix;
        // if(this.__cornerPointer){
        //     this.__currentGroup = this.__groups.getContainingGroup(this.__cornerPointer);
        //     this.__updateTransformControls();
        // }        
    }

    __toPixels(vector) {
        vector.x = Dimensioning.cmToPixel(vector.x);
        vector.y = Dimensioning.cmToPixel(vector.y);
        return vector;
    }

    __toUnits(pixels) {
        pixels.x = Dimensioning.pixelToCm(pixels.x);
        pixels.y = Dimensioning.pixelToCm(pixels.y);
        return pixels;
    }

    __setControlsPosition() {
        if (this.__parameters.scale) {
            let center = this.__resizer.center;
            let horizontal = this.__resizer.tr.clone().sub(this.__resizer.tl);
            let vertical = this.__resizer.bl.clone().sub(this.__resizer.tl);
            for (let i = 0; i < this.__scalingHandles.length; i++) {
                let handle = this.__scalingHandles[i];
                let hvect = horizontal.clone().multiplyScalar(handle.offset.x);
                let vvect = vertical.clone().multiplyScalar(handle.offset.y);
                let vect = hvect.add(vvect);
                let position = center.clone().add(vect);
                handle.position.set(position.x, position.y);
                // handle.updateCenterAndSize(center, size);
                this.__originalPositions.push(new Vector2(handle.position.x, handle.position.y));
            }
        }

        if (this.__parameters.rotate) {
            let midPoint = this.__resizer.br.clone().sub(this.__resizer.tr).multiplyScalar(0.5).add(this.__resizer.tr);
            let direction = this.__resizer.bl.clone().sub(this.__resizer.br).normalize().negate();
            let position = midPoint.add(direction.multiplyScalar(50));
            this.__rotateHandle.position.set(position.x, position.y);
        }

        if (this.__parameters.translate) {
            this.__translateHandle.position.set(this.__resizer.center.x, this.__resizer.center.y);
        }
    }

    __updateTransformControls() {
        this.__currentScale = new Vector2(1, 1);
        this.__size = this.__toPixels(this.__currentGroup.size.clone());
        this.__center = this.__toPixels(this.__currentGroup.center.clone());
        this.__matrix = this.__currentGroup.matrix.clone();

        if (this.__resizer) {
            this.__resizer.destroy();
            this.removeChild(this.__resizer);
        }

        this.__resizer = new CornerGroupRectangle(this.__floorplan, this.__size, this.__center);
        // this.__resizer.position.set(this.__center.x, this.__center.y);
        this.addChild(this.__resizer);
        this.__setControlsPosition();
    }

    get selected() {
        return this.__selected;
    }
    set selected(instanceOfCornerOrWallOrRoom) {
        if (this.__currentGroup) {
            this.__currentGroup.update();
        }
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
            this.__cornerPointer = corner;
            this.__updateTransformControls();
        } else {
            if (this.__resizer) {
                this.__resizer.destroy();
            }
            this.__cornerPointer = null;
        }
    }
}