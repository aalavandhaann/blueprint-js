import { Application, Graphics, Text } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Vector2, EventDispatcher, CompressedPixelFormat } from 'three';
import { EVENT_NEW, EVENT_DELETED, EVENT_LOADED, EVENT_2D_SELECTED, EVENT_NEW_ROOMS_ADDED, EVENT_KEY_RELEASED, EVENT_KEY_PRESSED, EVENT_WALL_2D_CLICKED, EVENT_CORNER_2D_CLICKED, EVENT_ROOM_2D_CLICKED, EVENT_NOTHING_2D_SELECTED, EVENT_MOVED, EVENT_MODE_RESET, EVENT_EXTERNAL_FLOORPLAN_LOADED } from '../core/events';
import { Grid2D } from './Grid2d';
import { CornerView2D } from './CornerView2D';
import { WallView2D } from './WallView2D';
import { RoomView2D } from './RoomView2D';
import { Dimensioning } from '../core/dimensioning';
import { KeyboardListener2D } from './KeyboardManager2D';
import { Configuration, snapToGrid, snapTolerance, viewBounds } from '../core/configuration';
import { IS_TOUCH_DEVICE } from '../../DeviceInfo';
import { CornerGroupTransform2D } from './CornerGroupTransform2D';
import Room from '../model/room';
import { BoundaryView2D } from './BoundaryView2D';

export const floorplannerModes = { MOVE: 0, DRAW: 1, EDIT_ISLANDS: 2 };

class TemporaryWall extends Graphics {
    constructor() {
        super();
        this.__textfield = new Text('Length: ', { fontFamily: 'Arial', fontSize: 14, fill: "black", align: 'center' });
        // this.__textfield.pivot.x = this.__textfield.pivot.y = 0.5;
        this.addChild(this.__textfield);
    }

    __toPixels(vector) {
        vector.x = Dimensioning.cmToPixel(vector.x);
        vector.y = Dimensioning.cmToPixel(vector.y);
        return vector;
    }

    update(corner, endPoint, startPoint) {
        this.clear();
        this.__textfield.visible = false;
        if (corner !== undefined && endPoint !== undefined) {
            let pxCornerCo = this.__toPixels(corner.location.clone());
            let pxEndPoint = this.__toPixels(endPoint.clone());
            let vect = endPoint.clone().sub(corner.location);
            let midPoint = (pxEndPoint.clone().sub(pxCornerCo).multiplyScalar(0.5)).add(pxCornerCo);;

            this.lineStyle(10, 0x008CBA);
            this.moveTo(pxCornerCo.x, pxCornerCo.y);
            this.lineTo(pxEndPoint.x, pxEndPoint.y);

            this.beginFill(0x008CBA, 0.5);
            this.drawCircle(pxEndPoint.x, pxEndPoint.y, 10);

            this.__textfield.position.x = midPoint.x;
            this.__textfield.position.y = midPoint.y;
            this.__textfield.text = Dimensioning.cmToMeasure(vect.length());
            this.__textfield.visible = true;
        }
        if (startPoint !== undefined) {
            let pxStartCo = this.__toPixels(startPoint);
            this.beginFill(0x008cba, 0.5);
            this.drawCircle(pxStartCo.x, pxStartCo.y, 10);
        }
    }
}

export class Viewer2D extends Application {
    constructor(canvasHolder, floorplan, options) {
        const { pixiAppOptions, pixiViewportOptions } = options;
        const pixiDefalultAppOpts = {
            width: 512, 
            height: 512,
            resolution: window.devicePixelRatio || 2,
            antialias: true,
            backgroundAlpha: true,
        };
        // super({width: 512, height: 512});
        super(Object.assign(pixiDefalultAppOpts, pixiAppOptions));
        this.__eventDispatcher = new EventDispatcher();

        let opts = { 
            'corner-radius': 20, 
            'boundary-point-radius': 5.0,
            'boundary-line-thickness': 1.0,
            'boundary-point-color':'#D3D3D3',
            'boundary-line-color':'#F3F3F3',
            pannable: true, 
            zoomable: true, 
            dimlinecolor: '#3EDEDE', 
            dimarrowcolor: '#000000', 
            dimtextcolor: '#000000', 
            scale: true, 
            rotate: true, 
            translate: true,
            resize: true,
        };

        for (var opt in opts) {
            if (opts.hasOwnProperty(opt) && options.hasOwnProperty(opt)) {
                opts[opt] = options[opt];
            }
        }

        // console.log('VIEWER 2D ::: ', opts);
        this.__mode = floorplannerModes.MOVE;
        this.__canvasHolder = document.getElementById(canvasHolder);
        this.__floorplan = floorplan;
        this.__options = opts;

        this.__lastNode = null;
        this.__tempWall = new TemporaryWall();

        this.__corners2d = [];
        this.__walls2d = [];
        this.__rooms2d = [];
        this.__entities2D = [];

        this.__externalCorners2d = [];
        this.__externalWalls2d = [];
        this.__externalRooms2d = [];
        this.__externalEntities2d = [];

        this.__worldWidth = 3000;
        this.__worldHeight = 3000;
        this.__currentWidth = 500;
        this.__currentHeight = 500;
        this.__currentSelection = null;

        this.__zoomedEvent = this.__zoomed.bind(this);
        this.__pannedEvent = this.__panned.bind(this);
        this.__selectionMonitorEvent = this.__selectionMonitor.bind(this);
        this.__cornerMovedEvent = this.__cornerMoved.bind(this);

        this.__drawModeMouseDownEvent = this.__drawModeMouseDown.bind(this);
        this.__drawModeMouseUpEvent = this.__drawModeMouseUp.bind(this);
        this.__drawModeMouseMoveEvent = this.__drawModeMouseMove.bind(this);

        this.__redrawFloorplanEvent = this.__redrawFloorplan.bind(this);
        this.__drawExternalFloorplanEvent = this.__drawExternalFloorplan.bind(this);
        this.__windowResizeEvent = this._handleWindowResize.bind(this);
        this.__resetFloorplanEvent = this.__resetFloorplan.bind(this);

        this.__floorplanLoadedEvent = this.__center.bind(this);

        const pixiViewportDefaultOpts = {
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: this.__worldWidth,
            worldHeight: this.__worldHeight,
            interaction: this.renderer.plugins.interaction,
            passiveWheel: false,
        };

        this.__floorplanContainer = new Viewport(Object.assign(pixiViewportDefaultOpts, pixiViewportOptions));
        this.__tempWallHolder = new Graphics();

        this.__snapToGrid = false;
        this.__keyboard = new KeyboardListener2D();
        this.__keyListenerEvent = this.__keyListener.bind(this);        

        let origin = new Graphics();
        this.__floorplanElementsHolder = new Graphics();
        this.__boundaryHolder = new Graphics();
        this.__grid2d = new Grid2D(this.view, options);
        this.__boundaryRegion2D = null;
        this.__groupTransformer = new CornerGroupTransform2D(this.__floorplan, this.__options);
        this.__groupTransformer.visible = false;
        this.__groupTransformer.selected = null;

        origin.beginFill(0xFF0000);
        origin.drawCircle(0, 0, 5);

        this.__floorplanContainer.position.set(window.innerWidth * 0.5, window.innerHeight * 0.5);

        this.renderer.backgroundColor = 0xFFFFFF;
        this.renderer.autoResize = true;

        this.__tempWall.visible = false;

        this.__floorplanContainer.addChild(this.__grid2d);
        this.__floorplanContainer.addChild(this.__boundaryHolder);
        // this.__floorplanContainer.addChild(this.__tempWall);
        this.__floorplanContainer.addChild(origin);
        this.__floorplanContainer.addChild(this.__floorplanElementsHolder);
        this.__floorplanContainer.addChild(this.__groupTransformer);

        this.__tempWallHolder.addChild(this.__tempWall);


        this.stage.addChild(this.__floorplanContainer);
        this.stage.addChild(this.__tempWallHolder);

        this.__canvasHolder.appendChild(this.view);

        this.__floorplanContainer.drag().pinch().wheel();
        
        if (!this.__options.pannable) {
            this.__floorplanContainer.plugins.pause('drag');
        }

        if (!this.__options.zoomable) {
            this.__floorplanContainer.plugins.pause('wheel');
            this.__floorplanContainer.plugins.pause('pinch');
        }

        this.__keyboard.addEventListener(EVENT_KEY_RELEASED, this.__keyListenerEvent);
        this.__keyboard.addEventListener(EVENT_KEY_PRESSED, this.__keyListenerEvent);

        this.__floorplanContainer.on('zoomed', this.__zoomedEvent);
        this.__floorplanContainer.on('moved', this.__pannedEvent);
        this.__floorplanContainer.on('clicked', this.__selectionMonitorEvent);

        this.__floorplanContainer.on('mousedown', this.__drawModeMouseDownEvent);
        this.__floorplanContainer.on('mouseup', this.__drawModeMouseUpEvent);
        this.__floorplanContainer.on('mousemove', this.__drawModeMouseMoveEvent);

        //User touches the screen then emulate the Mouseup event creating a corner
        this.__floorplanContainer.on('touchstart', this.__drawModeMouseUpEvent);
        //User then touch moves and lifts the finger away from the screen. Now create the next corner
        this.__floorplanContainer.on('touchend', this.__drawModeMouseUpEvent);

        //Use touches and drags across the screen then emulate drawing the temporary wall
        this.__floorplanContainer.on('touchmove', this.__drawModeMouseMoveEvent);

        // this.__floorplan.addEventListener(EVENT_UPDATED, (evt) => scope.__redrawFloorplan(evt));

        this.__floorplan.addEventListener(EVENT_LOADED, this.__floorplanLoadedEvent);

        this.__floorplan.addEventListener(EVENT_MODE_RESET, this.__resetFloorplanEvent);
        this.__floorplan.addEventListener(EVENT_NEW, this.__redrawFloorplanEvent);
        this.__floorplan.addEventListener(EVENT_DELETED, this.__redrawFloorplanEvent);

        this.__floorplan.addEventListener(EVENT_NEW_ROOMS_ADDED, this.__redrawFloorplanEvent);

        this.__floorplan.addEventListener(EVENT_EXTERNAL_FLOORPLAN_LOADED, this.__drawExternalFloorplanEvent);


        window.addEventListener('resize', this.__windowResizeEvent);
        window.addEventListener('orientationchange', this.__windowResizeEvent);

        this._handleWindowResize();

        this.__center();
    }

    __drawBoundary(){
        // return;
        if(this.__boundaryRegion2D){
            this.__boundaryRegion2D.remove();
        }

        if(this.__floorplan.boundary){
            if(this.__floorplan.boundary.isValid){
                this.__boundaryRegion2D = new BoundaryView2D(this.__floorplan, this.__options, this.__floorplan.boundary);
                this.__boundaryHolder.addChild(this.__boundaryRegion2D);
            }            
        }
    }

    __keyListener(evt) {

        if (evt.type === EVENT_KEY_PRESSED && evt.key === 'Shift') {
            this.__snapToGrid = true;
        }
        if (evt.type === EVENT_KEY_RELEASED && evt.key === 'Shift') {
            this.__snapToGrid = false;
        }
        if (evt.key === 'Escape') {
            this.switchMode(floorplannerModes.MOVE);
        }
    }

    switchMode(mode) {
        if(this.__mode === floorplannerModes.EDIT_ISLANDS && mode !== floorplannerModes.EDIT_ISLANDS){
            this.__floorplan.update();
        }
        switch (mode) {
            case floorplannerModes.DRAW:
                this.__mode = floorplannerModes.DRAW;
                this.__floorplanContainer.plugins.pause('drag');
                for (let i = 0; i < this.__entities2D.length; i++) {
                    this.__entities2D[i].interactive = false;
                }
                this.__changeCursorMode();
                this.__tempWall.update();
                this.__tempWall.visible = true;
                this.__groupTransformer.visible = false;
                this.__groupTransformer.selected = null;
                break;
            case floorplannerModes.EDIT_ISLANDS:
                this.__mode = floorplannerModes.EDIT_ISLANDS;
                if (this.__currentSelection instanceof Room) {
                    this.__groupTransformer.visible = true;
                    this.__groupTransformer.selected = this.__currentSelection;
                } else {
                    this.__groupTransformer.visible = false;
                    this.__groupTransformer.selected = null;
                }

                this.__floorplanContainer.plugins.pause('drag');
                for (let i = 0; i < this.__corners2d.length; i++) {
                    this.__corners2d[i].interactive = false;
                }
                for (let i = 0; i < this.__walls2d.length; i++) {
                    this.__walls2d[i].interactive = false;
                }
                this.__changeCursorMode();
                break;
            case floorplannerModes.MOVE:
                this.__mode = floorplannerModes.MOVE;
                for (let i = 0; i < this.__entities2D.length; i++) {
                    this.__entities2D[i].interactive = true;
                }
                this.__tempWall.visible = false;
                this.__groupTransformer.visible = false;
                this.__groupTransformer.selected = null;
                this.__lastNode = null;
                this.__floorplanContainer.plugins.resume('drag');
                this.__changeCursorMode();
                break;
            default:
                throw new Error('Unknown Viewer2D mode');
        }
    }

    __changeCursorMode() {
        let cursor = (this.__mode === floorplannerModes.DRAW) ? 'crosshair' : 'pointer';
        this.renderer.plugins.interaction.cursorStyles.crosshair = cursor;
        this.renderer.plugins.interaction.cursorStyles.default = cursor;
        this.renderer.plugins.interaction.setCursorMode(cursor);
    }

    __drawModeMouseDown(evt) {
        if (IS_TOUCH_DEVICE) {
            this.__drawModeMouseUp(evt);
        }
    }

    __drawModeMouseUp(evt) {
        if (this.__mode === floorplannerModes.DRAW) {
            let co = evt.data.getLocalPosition(this.__floorplanContainer);
            let cmCo = new Vector2(co.x, co.y);
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || this.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }

            if(this.__floorplan.boundary){
                if(this.__floorplan.boundary.containsPoint(cmCo.x, cmCo.y)){
                    return;
                }
            }

            // This creates the corner already
            let corner = this.__floorplan.newCorner(cmCo.x, cmCo.y);

            // further create a newWall based on the newly inserted corners
            // (one in the above line and the other in the previous mouse action
            // of start drawing a new wall)
            if (this.__lastNode != null) {
                this.__floorplan.newWall(this.__lastNode, corner);
                this.__floorplan.newWallsForIntersections(this.__lastNode, corner);
                // this.__tempWall.visible = false;
                // this.switchMode(floorplannerModes.MOVE);
            }
            if (corner.mergeWithIntersected() && this.__lastNode != null) {
                this.__tempWall.visible = false;
                this.__lastNode = null;
                this.switchMode(floorplannerModes.MOVE);
            }

            if (this.__lastNode === null && this.__mode === floorplannerModes.DRAW) {
                this.__tempWall.visible = true;
            }

            if (IS_TOUCH_DEVICE && corner && this.__lastNode !== null) {
                this.__tempWall.visible = false;
                this.__lastNode = null;
            } else {
                this.__lastNode = corner;
            }


        }
    }

    __drawModeMouseMove(evt) {
        if (this.__mode === floorplannerModes.DRAW) {
            let co = evt.data.getLocalPosition(this.__floorplanContainer);
            let cmCo = new Vector2(co.x, co.y);
            let lastNode = undefined;
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || this.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }
            if (this.__lastNode !== null) {
                this.__tempWall.update(this.__lastNode, cmCo);
            } else {
                this.__tempWall.update(lastNode, undefined, cmCo);
            }
        }
    }

    __cornerMoved(evt) {
        if (this.__mode === floorplannerModes.EDIT_ISLANDS) {
            return;
        }
        this.__groupTransformer.visible = false;
        this.__groupTransformer.selected = null;
    }

    __selectionMonitor(evt) {
        this.__currentSelection = null;
        this.__groupTransformer.visible = false;
        this.__groupTransformer.selected = null;
        this.__eventDispatcher.dispatchEvent({ type: EVENT_NOTHING_2D_SELECTED });
        for (let i = 0; i < this.__entities2D.length; i++) {
            let entity = this.__entities2D[i];
            if (evt.item !== undefined) {
                if (evt.item === entity) {
                    continue;
                }
            }
            entity.selected = false;
        }
        if (evt.item) {
            let item = null;
            if (evt.item instanceof WallView2D) {
                item = evt.item.wall;
                this.__eventDispatcher.dispatchEvent({ type: EVENT_WALL_2D_CLICKED, item: evt.item.wall, entity: evt.item });
            } else if (evt.item instanceof CornerView2D) {
                item = evt.item.corner;
                this.__eventDispatcher.dispatchEvent({ type: EVENT_CORNER_2D_CLICKED, item: evt.item.corner, entity: evt.item });
            } else if (evt.item instanceof RoomView2D) {
                item = evt.item.room;
                this.__eventDispatcher.dispatchEvent({ type: EVENT_ROOM_2D_CLICKED, item: evt.item.room, entity: evt.item });
            }
            if (this.__mode === floorplannerModes.EDIT_ISLANDS) {
                this.__groupTransformer.visible = true;
                this.__groupTransformer.selected = item;
            }
            this.__currentSelection = item;
        }
    }

    __center(){
        let floorplanCenter = this.__floorplan.getCenter();
        let zoom = this.__floorplanContainer.scale.x;
        let windowSize = new Vector2(this.__currentWidth, this.__currentHeight); 
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;
        // console.log(windowSize.x, windowSize.y);
        let x = (windowSize.x * 0.5)-(floorplanCenter.x*0.5);// - (bounds*0.5);
        let y = (windowSize.y * 0.5)-(floorplanCenter.z*0.5);// - (bounds*0.5);
        this.__floorplanContainer.x = x;
        this.__floorplanContainer.y = y;
        this.__tempWallHolder.x = x;
        this.__tempWallHolder.y = y;
        // console.log(x, y, floorplanCenter);
    }

    __zoomed() {
        let zoom = this.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds));// * zoom;
        let maxZoomOut = Math.max(window.innerWidth, window.innerHeight) / bounds;
        zoom = (zoom < maxZoomOut) ? maxZoomOut : (zoom > 60) ? 60 : zoom;
        
        this.__floorplanContainer.scale.x = this.__floorplanContainer.scale.y = zoom;
        this.__tempWallHolder.scale.x = this.__tempWallHolder.scale.y = zoom;

        this.__grid2d.gridScale = this.__floorplanContainer.scale.x;
    }

    __panned() {
        let zoom = this.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;

        let xy = new Vector2(this.__floorplanContainer.x, this.__floorplanContainer.y);
        let topleft = new Vector2((-(bounds*0.5)), (-(bounds*0.5)));
        let bottomright = new Vector2(((bounds*0.5)), ((bounds*0.5)));
        
        // let windowSize = new Vector2(window.innerWidth, window.innerHeight);
        let windowSize = new Vector2(this.__currentWidth, this.__currentHeight);        
      
        let xValue = Math.min(-topleft.x, xy.x);
        let yValue = Math.min(-topleft.y, xy.y);

        xValue = Math.max(windowSize.x-bottomright.x, xValue);
        yValue = Math.max(windowSize.y-bottomright.y, yValue);
        
        
        this.__floorplanContainer.x = this.__tempWallHolder.x = xValue;
        this.__floorplanContainer.y = this.__tempWallHolder.y = yValue;
        // console.log('---------------------------------------------');
        // console.log('CURRENT ZOOM :: ', zoom);
        // console.log('TOP LEFT :: ', topleft);
        // console.log('BOTTOM RIGHT :: ', bottomright);
        // console.log('WINDOW SIZE :: ', windowSize);
        // console.log(`X=${xValue}, Y=${yValue}`);
    }

    __resetFloorplan(evt) {
        this.__mode = floorplannerModes.MOVE;
        this.__groupTransformer.visible = false;
        this.__groupTransformer.selected = null;
        this.__drawExternalFloorplan();
    }

    __redrawFloorplan() {
        let scope = this;
        let i = 0;

        // clear scene
        scope.__entities2D.forEach((entity) => {
            entity.removeFloorplanListener(EVENT_2D_SELECTED, this.__selectionMonitorEvent);
            entity.remove();
        });

        this.__drawBoundary();

        this.__corners2d = [];
        this.__walls2d = [];
        this.__rooms2d = [];
        this.__entities2D = [];

        let rooms = this.__floorplan.getRooms();

        for (i = 0; i < rooms.length; i++) {
            let modelRoom = rooms[i];
            let roomView = new RoomView2D(this.__floorplan, this.__options, modelRoom);
            this.__floorplanElementsHolder.addChild(roomView);
            this.__rooms2d.push(roomView);
            this.__entities2D.push(roomView);
            roomView.interactive = (this.__mode === floorplannerModes.MOVE);
            roomView.addFloorplanListener(EVENT_2D_SELECTED, this.__selectionMonitorEvent);
        }
        for (i = 0; i < this.__floorplan.walls.length; i++) {
            let modelWall = this.__floorplan.walls[i];
            let wallView = new WallView2D(this.__floorplan, this.__options, modelWall);
            this.__floorplanElementsHolder.addChild(wallView);
            this.__walls2d.push(wallView);
            this.__entities2D.push(wallView);
            wallView.interactive = (this.__mode === floorplannerModes.MOVE);
            wallView.addFloorplanListener(EVENT_2D_SELECTED, this.__selectionMonitorEvent);
        }
        for (i = 0; i < this.__floorplan.corners.length; i++) {
            let modelCorner = this.__floorplan.corners[i];
            let cornerView = new CornerView2D(this.__floorplan, this.__options, modelCorner);
            this.__floorplanElementsHolder.addChild(cornerView);
            this.__corners2d.push(cornerView);
            this.__entities2D.push(cornerView);
            cornerView.interactive = (this.__mode === floorplannerModes.MOVE);
            cornerView.addFloorplanListener(EVENT_2D_SELECTED, this.__selectionMonitorEvent);
            modelCorner.removeEventListener(EVENT_MOVED, this.__cornerMovedEvent);
            modelCorner.addEventListener(EVENT_MOVED, this.__cornerMovedEvent);
        }
        this._handleWindowResize();
    }

    __drawExternalFloorplan() {
        let scope = this;
        let i = 0;
        // clear scene
        scope.__externalEntities2d.forEach((entity) => {
            entity.remove();
        });

        this.__drawBoundary();

        this.__externalCorners2d = [];
        this.__externalWalls2d = [];
        this.__externalRooms2d = [];

        let rooms = this.__floorplan.externalRooms;

        for (i = 0; i < rooms.length; i++) {
            let modelRoom = rooms[i];
            let roomView = new RoomView2D(this.__floorplan, this.__options, modelRoom);
            this.__floorplanElementsHolder.addChild(roomView);
            this.__externalRooms2d.push(roomView);
            this.__externalEntities2d.push(roomView);
        }
        for (i = 0; i < this.__floorplan.externalWalls.length; i++) {
            let modelWall = this.__floorplan.externalWalls[i];
            let wallView = new WallView2D(this.__floorplan, this.__options, modelWall);
            this.__floorplanElementsHolder.addChild(wallView);
            this.__externalWalls2d.push(wallView);
            this.__externalEntities2d.push(wallView);
        }
        for (i = 0; i < this.__floorplan.externalCorners.length; i++) {
            let modelCorner = this.__floorplan.externalCorners[i];
            let cornerView = new CornerView2D(this.__floorplan, this.__options, modelCorner);
            this.__floorplanElementsHolder.addChild(cornerView);
            this.__externalCorners2d.push(cornerView);
            this.__externalEntities2d.push(cornerView);
        }
        this._handleWindowResize();
    }

    /** */
    _handleWindowResize() {

        let heightMargin = this.__canvasHolder.offsetTop;
        let widthMargin = this.__canvasHolder.offsetLeft;

        let w = (this.__options.resize)? window.innerWidth - widthMargin : this.__canvasHolder.clientWidth;
        let h = (this.__options.resize)? window.innerHeight - heightMargin : this.__canvasHolder.clientHeight;
        
        this.__currentWidth = w;
        this.__currentHeight = h;

        this.renderer.resize(w, h);
        this.renderer.view.style.width = w + 'px';
        this.renderer.view.style.height = h + 'px';
        this.renderer.view.style.display = 'block';
        this.__floorplanContainer.resize(w, h, this.__worldWidth, this.__worldHeight);


        this.renderer.render(this.stage);
        this.__zoomed();
        this.__panned();
    }

    addFloorplanListener(type, listener) {
        this.__eventDispatcher.addEventListener(type, listener);
    }

    removeFloorplanListener(type, listener) {
        this.__eventDispatcher.removeEventListener(type, listener);
    }

    dispose() {
        this.__floorplanContainer.off('zoomed', this.__zoomedEvent);
        this.__floorplanContainer.off('moved', this.__pannedEvent);
        this.__floorplanContainer.off('clicked', this.__selectionMonitorEvent);

        // this.__floorplan.addEventListener(EVENT_UPDATED, (evt) => scope.__redrawFloorplan(evt));
        this.__floorplan.removeEventListener(EVENT_NEW, this.__redrawFloorplanEvent);
        this.__floorplan.removeEventListener(EVENT_DELETED, this.__redrawFloorplanEvent);
        this.__floorplan.removeEventListener(EVENT_LOADED, this.__redrawFloorplanEvent);
        window.removeEventListener('resize', this.__windowResizeEvent);
        window.removeEventListener('orientationchange', this.__windowResizeEvent);
    }
}