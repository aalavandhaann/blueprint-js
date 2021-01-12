import { EventDispatcher, Vector2 } from 'three';
import { Graphics } from 'pixi.js';
import { EVENT_2D_SELECTED, EVENT_2D_UNSELECTED, EVENT_KEY_RELEASED, EVENT_KEY_PRESSED } from '../core/events';
import { KeyboardListener2D } from './KeyboardManager2D';
import { Dimensioning } from '../core/dimensioning';

export class BaseFloorplanViewElement2D extends Graphics {
    constructor(floorplan, options) {
        super();
        this.__floorplan = floorplan;
        this.__options = {};
        for (let opt in options){
            this.__options[opt] = options[opt];
        }
        this.__eventDispatcher = new EventDispatcher();
        this.__interactable = true;
        this.interactive = true;
        this.buttonMode = true;
        this.__isDragging = false;
        this.__isSelected = false;
        this.__snapToGrid = false;
        this.__keyboard = new KeyboardListener2D();
        this.__mouseDownEvent = this.__dragStart.bind(this);
        this.__mouseUpEvent = this.__dragEnd.bind(this);
        this.__mouseMoveEvent = this.__dragMove.bind(this);
        this.__mouseOverEvent = this.__mouseOver.bind(this);
        this.__mouseOutEvent = this.__mouseOut.bind(this);
        this.__mouseClickEvent = this.__click.bind(this);

        this.__keyListenerEvent = this.__keyListener.bind(this);


        this.on('mousedown', this.__mouseClickEvent).on('touchstart', this.__mouseClickEvent);
        this.on('mouseupoutside', this.__mouseUpEvent).on('touchendoutside', this.__mouseUpEvent);
        this.on('mouseup', this.__mouseUpEvent).on('touchend', this.__mouseUpEvent);
        this.on('mousemove', this.__mouseMoveEvent).on('touchmove', this.__mouseMoveEvent);
        this.on('mouseover', this.__mouseOverEvent).on('mouseout', this.__mouseOutEvent);
        // this.on('click', this.__mouseClickEvent);

        this.__keyboard.addEventListener(EVENT_KEY_RELEASED, this.__keyListenerEvent);
        this.__keyboard.addEventListener(EVENT_KEY_PRESSED, this.__keyListenerEvent);
    }

    __deactivate() {
        this.off('mousedown', this.__mouseClickEvent).off('touchstart', this.__mouseClickEvent);
        this.off('mouseupoutside', this.__mouseUpEvent).off('touchendoutside', this.__mouseUpEvent);
        this.off('mouseup', this.__mouseUpEvent).off('touchend', this.__mouseUpEvent);
        this.off('mousemove', this.__mouseMoveEvent).off('touchmove', this.__mouseMoveEvent);
        this.off('mouseover', this.__mouseOverEvent).off('mouseout', this.__mouseOutEvent);
    }

    __keyListener(evt) {
        if (this.selected && evt.key === 'Delete') {
            this.__removeFromFloorplan();
        }

        if (evt.type === EVENT_KEY_PRESSED && evt.key === 'Shift') {
            this.__snapToGrid = true;
        }
        if (evt.type === EVENT_KEY_RELEASED && evt.key === 'Shift') {
            this.__snapToGrid = false;
        }
    }

    __vectorToPixels(v) {
        return new Vector2(Dimensioning.cmToPixel(v.x), Dimensioning.cmToPixel(v.y));
    }

    __drawSelectedState() {

    }
    __drawHoveredOnState() {

    }
    __drawHoveredOffState() {

    }

    __click(evt) {
        this.selected = true; //!this.selected;
        this.__isDragging = true;
        this.__dragStart(evt);
        this.__drawSelectedState();
        if (evt !== undefined) {
            evt.stopPropagation();
        }
    }

    __mouseOver(evt) {
        if (!this.selected) {
            this.__drawHoveredOnState();
            evt.stopPropagation();
        }
    }

    __mouseOut(evt) {
        if (!this.selected) {
            this.__drawHoveredOffState();
            if (evt !== undefined) {
                evt.stopPropagation();
            }
        }
    }
    __dragStart(evt) {
        this.__isDragging = true;
        if(evt){
            evt.stopPropagation();
        }        
    }

    __dragEnd(evt) {
        this.__isDragging = false;
        evt.stopPropagation();
    }

    __dragMove(evt) {
        if (this.__isDragging) {
            evt.stopPropagation();
        }
    }
        /**
         * The below method is necessary if the remove event was
         * triggered from within this view class. For example, this view
         * class keeps listening to the delete key pressed. In such a case
         * it is the job of this view class to call the "remove()" method of the
         * associated method. 
         */
    __removeFromFloorplan() {
        //Stub the sub-classes need to implement this functionality
    }

    remove() {
        this.off('mousedown', this.__mouseDownEvent).off('touchstart', this.__mouseDownEvent);
        this.off('mouseupoutside', this.__mouseUpEvent).off('touchendoutside', this.__mouseUpEvent);
        this.off('mouseup', this.__mouseUpEvent).off('touchend', this.__mouseUpEvent);
        this.off('mousemove', this.__mouseMoveEvent).off('touchmove', this.__mouseMoveEvent);
        this.off('mouseover', this.__mouseOverEvent).off('mouseout', this.__mouseOutEvent);
        this.off('click', this.__mouseClickEvent);
        this.__keyboard.removeEventListener(EVENT_KEY_RELEASED, this.__keyListenerEvent);
        this.__keyboard.removeEventListener(EVENT_KEY_PRESSED, this.__keyListenerEvent);
        this.__keyboard.remove();
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    addFloorplanListener(type, listener) {
        this.__eventDispatcher.addEventListener(type, listener);
    }

    removeFloorplanListener(type, listener) {
        this.__eventDispatcher.removeEventListener(type, listener);
    }

    get selected() {
        return this.__isSelected;
    }

    set selected(flag) {
        this.__isSelected = flag;
        if (!this.__isSelected) {
            this.__drawHoveredOffState();
        }
        if (flag) {
            this.__eventDispatcher.dispatchEvent({ type: EVENT_2D_SELECTED, item: this });
        } else {
            this.__eventDispatcher.dispatchEvent({ type: EVENT_2D_UNSELECTED, item: this });
        }
    }

    get interactable() {
        return this.__interactable;
    }

    set interactable(flag) {
        this.__interactable = flag;
        this.interactive = flag;
        this.buttonMode = flag;
    }
}