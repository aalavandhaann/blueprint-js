import { WebGLRenderer, ImageUtils, PerspectiveCamera, AxesHelper, Scene } from 'three';
import { PCFSoftShadowMap } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

import { EVENT_UPDATED, EVENT_LOADED, EVENT_ITEM_SELECTED, EVENT_ITEM_MOVE, EVENT_ITEM_MOVE_FINISH, EVENT_NO_ITEM_SELECTED } from '../core/events.js';
// import { EVENT_NEW, EVENT_DELETED } from '../core/events.js';

import { Skybox } from './skybox.js';
// import { WallView3D } from './WallView3d.js';
import { Edge3D } from './edge3d.js';
import { Floor3D } from './floor3d.js';
import { Lights3D } from './lights3d.js';
import { Physical3DItem } from './Physical3DItem.js';
import { DragRoomItemsControl3D } from './DragRoomItemsControl3D.js';

export class Viewer3D extends Scene {
    constructor(model, element, opts) {
        super();
        var options = { resize: true, pushHref: false, spin: true, spinSpeed: .00002, clickPan: true, canMoveFixedItems: false };
        for (var opt in options) {
            if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
                options[opt] = opts[opt];
            }
        }
        this.__physicalRoomItems = [];
        this.__enabled = true;
        this.model = model;
        this.floorplan = this.model.floorplan;
        this.options = options;

        this.domElement = document.getElementById(element);

        this.perspectivecamera = null;
        this.camera = null;

        this.cameraNear = 10;
        this.cameraFar = 10000;

        this.controls = null;

        this.renderer = null;
        this.controller = null;

        this.needsUpdate = false;
        this.lastRender = Date.now();

        this.heightMargin = null;
        this.widthMargin = null;
        this.elementHeight = null;
        this.elementWidth = null;
        this.pauseRender = false;
        this.edges3d = [];
        this.floors3d = [];
        this.__currentItemSelected = null;

        this.needsUpdate = true;

        this.__roomItemSelectedEvent = this.__roomItemSelected.bind(this);
        this.__roomItemUnselectedEvent = this.__roomItemUnselected.bind(this);
        this.__roomItemDraggedEvent = this.__roomItemDragged.bind(this);
        this.__roomItemDragFinishEvent = this.__roomItemDragFinish.bind(this);

        this.init();
    }

    init() {
        let scope = this;
        ImageUtils.crossOrigin = '';

        scope.camera = new PerspectiveCamera(45, 10, scope.cameraNear, scope.cameraFar);

        scope.renderer = scope.getARenderer();
        scope.domElement.appendChild(scope.renderer.domElement);

        scope.lights = new Lights3D(this, scope.floorplan);
        // scope.dragcontrols = new DragControls(this.physicalRoomItems, scope.camera, scope.renderer.domElement);
        scope.dragcontrols = new DragRoomItemsControl3D(this.physicalRoomItems, scope.camera, scope.renderer.domElement);
        scope.controls = new OrbitControls(scope.camera, scope.domElement);
        // scope.controls.autoRotate = this.options['spin'];
        scope.controls.enableDamping = false;
        scope.controls.dampingFactor = 0.1;
        scope.controls.maxPolarAngle = Math.PI * 1.0; //Math.PI * 0.5; //Math.PI * 0.35;
        scope.controls.maxDistance = 2500; //2500
        scope.controls.minDistance = 10; //1000; //1000
        scope.controls.screenSpacePanning = true;

        scope.skybox = new Skybox(this, scope.renderer);
        scope.camera.position.set(0, 600, 1500);
        scope.controls.update();

        scope.axes = new AxesHelper(500);


        // handle window resizing
        scope.updateWindowSize();

        if (scope.options.resize) {
            window.addEventListener('resize', () => { scope.updateWindowSize(); });
            window.addEventListener('orientationchange', () => { scope.updateWindowSize(); });
        }

        function animate() {
            scope.renderer.setAnimationLoop(function() { scope.render(); });
            scope.render();
        }
        scope.model.addEventListener(EVENT_LOADED, (evt) => scope.addRoomItems(evt));
        scope.floorplan.addEventListener(EVENT_UPDATED, (evt) => scope.addWalls(evt));
        this.controls.addEventListener('change', () => { scope.needsUpdate = true; });
        scope.dragcontrols.addEventListener(EVENT_ITEM_SELECTED, this.__roomItemSelectedEvent);
        scope.dragcontrols.addEventListener(EVENT_ITEM_MOVE, this.__roomItemDraggedEvent);
        scope.dragcontrols.addEventListener(EVENT_ITEM_MOVE_FINISH, this.__roomItemDragFinishEvent);
        scope.dragcontrols.addEventListener(EVENT_NO_ITEM_SELECTED, this.__roomItemUnselectedEvent);
        // scope.controls.enabled = false;//To test the drag controls

        animate();
    }

    __roomItemSelected(evt) {
        if (this.__currentItemSelected) {
            this.__currentItemSelected.selected = false;
        }
        this.__currentItemSelected = evt.item;
        this.__currentItemSelected.selected = true;
        this.needsUpdate = true;
    }

    __roomItemDragged(evt) {
        this.controls.enabled = false;
        this.needsUpdate = true;
    }

    __roomItemDragFinish(evt) {
        this.controls.enabled = true;
    }

    __roomItemUnselected(evt) {
        this.controls.enabled = true;
        if (this.__currentItemSelected) {
            this.__currentItemSelected.selected = false;
            this.__currentItemSelected = null;
            this.needsUpdate = true;
        }
    }

    addRoomItems(evt) {
        let i = 0;
        for (; i < this.__physicalRoomItems.length; i++) {
            this.__physicalRoomItems[i].dispose();
            this.remove(this.__physicalRoomItems[i]);
        }
        this.__physicalRoomItems.length = 0; //A cool way to clear an array in javascript
        let roomItems = this.model.roomItems;
        for (i = 0; i < roomItems.length; i++) {
            let physicalRoomItem = new Physical3DItem(roomItems[i]);
            this.add(physicalRoomItem);
            this.__physicalRoomItems.push(physicalRoomItem);
        }

    }

    addWalls() {
        let scope = this;
        let i = 0;

        // clear scene
        scope.floors3d.forEach((floor) => {
            floor.removeFromScene();
        });

        scope.edges3d.forEach((edge3d) => {
            edge3d.remove();
        });

        scope.edges3d = [];
        let wallEdges = scope.floorplan.wallEdges();
        let rooms = scope.floorplan.getRooms();

        // draw floors
        for (i = 0; i < rooms.length; i++) {
            var threeFloor = new Floor3D(scope, rooms[i]);
            scope.floors3d.push(threeFloor);
            threeFloor.addToScene();
        }

        for (i = 0; i < wallEdges.length; i++) {
            let edge3d = new Edge3D(scope, wallEdges[i], scope.controls);
            scope.edges3d.push(edge3d);
        }

        // let walls = scope.floorplan.getWalls();
        // for (i = 0; i < walls.length; i++) {
        //     let wall3d = new WallView3D(walls[i], scope.floorplan, scope, scope.controls);
        //     scope.scene.add(wall3d);
        //     scope.walls3d.push(wall3d);
        // }

        scope.shouldRender = true;

        let floorplanCenter = scope.floorplan.getDimensions(true);
        scope.controls.target = floorplanCenter.clone();
        scope.camera.position.set(floorplanCenter.x, 300, floorplanCenter.z * 5);
        scope.controls.update();
    }

    getARenderer() {
        var renderer = new WebGLRenderer({ antialias: true, alpha: true });

        // scope.renderer.autoClear = false;
        renderer.shadowMap.enabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        renderer.setClearColor(0xFFFFFF, 1);
        renderer.localClippingEnabled = false;
        //		renderer.setPixelRatio(window.devicePixelRatio);
        // renderer.sortObjects = false;
        return renderer;
    }

    updateWindowSize() {
        var scope = this;

        scope.heightMargin = scope.domElement.offsetTop;
        scope.widthMargin = scope.domElement.offsetLeft;
        scope.elementWidth = scope.domElement.clientWidth;

        if (scope.options.resize) {
            scope.elementHeight = window.innerHeight - scope.heightMargin;
        } else {
            scope.elementHeight = scope.domElement.clientHeight;
        }
        scope.camera.aspect = scope.elementWidth / scope.elementHeight;
        scope.camera.updateProjectionMatrix();
        scope.renderer.setSize(scope.elementWidth, scope.elementHeight);
        scope.needsUpdate = true;
    }

    render() {
        if (!this.enabled) {
            return;
        }
        let scope = this;
        // scope.controls.update();
        if (!scope.needsUpdate) {
            return;
        }
        scope.renderer.render(scope, scope.camera);
        scope.lastRender = Date.now();
        this.needsUpdate = false;
    }

    get physicalRoomItems() {
        return this.__physicalRoomItems;
    }

    get enabled() {
        return this.__enabled;
    }

    set enabled(flag) {
        this.__enabled = flag;
        this.controls.enabled = flag;
        if (!flag) {
            this.dragcontrols.deactivate();
        } else {
            this.dragcontrols.activate();
        }
    }

}