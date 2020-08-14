import { EventDispatcher, WebGLRenderer, ImageUtils, PerspectiveCamera, AxesHelper } from 'three';
import { PCFSoftShadowMap } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

import { EVENT_UPDATED } from '../core/events.js';
// import { EVENT_NEW, EVENT_DELETED } from '../core/events.js';

import { Skybox } from './skybox.js';
// import { WallView3D } from './WallView3d.js';
import { Edge3D } from './edge3d.js';
import { Floor3D } from './floor3d.js';
import { Lights3D } from './lights3d.js';

export class Viewer3D extends EventDispatcher {
    constructor(model, element, opts) {
        super();
        var options = { resize: true, pushHref: false, spin: true, spinSpeed: .00002, clickPan: true, canMoveFixedItems: false };
        for (var opt in options) {
            if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
                options[opt] = opts[opt];
            }
        }
        this.model = model;
        this.floorplan = this.model.floorplan;
        this.scene = model.scene;
        this.options = options;

        this.domElement = document.getElementById(element);
        console.log('QUERY DOM ELEMENT : ', element, this.domElement, element);
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
        // this.walls3d = [];
        this.draggables = [];

        this.scene.needsUpdate = true;

        this.init();
    }

    init() {
        var scope = this;
        ImageUtils.crossOrigin = '';

        scope.camera = new PerspectiveCamera(45, 10, scope.cameraNear, scope.cameraFar);

        scope.renderer = scope.getARenderer();
        scope.domElement.appendChild(scope.renderer.domElement);

        scope.lights = new Lights3D(scope.scene, scope.floorplan);
        scope.dragcontrols = new DragControls(scope.scene.items, scope.camera, scope.renderer.domElement);
        scope.controls = new OrbitControls(scope.camera, scope.domElement);
        // scope.controls.autoRotate = this.options['spin'];
        scope.controls.enableDamping = false;
        scope.controls.dampingFactor = 0.1;
        scope.controls.maxPolarAngle = Math.PI * 1.0; //Math.PI * 0.5; //Math.PI * 0.35;
        scope.controls.maxDistance = 2500; //2500
        scope.controls.minDistance = 10; //1000; //1000
        scope.controls.screenSpacePanning = true;

        scope.skybox = new Skybox(scope.scene, scope.renderer);
        scope.camera.position.set(0, 600, 1500);
        scope.controls.update();

        scope.axes = new AxesHelper(500);
        // scope.scene.add(scope.axes);

        scope.dragcontrols.addEventListener('dragstart', () => { scope.controls.enabled = false; });
        scope.dragcontrols.addEventListener('drag', () => { scope.scene.needsUpdate = true; });
        scope.dragcontrols.addEventListener('dragend', () => { scope.controls.enabled = true; });

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
        scope.floorplan.addEventListener(EVENT_UPDATED, (evt) => scope.addWalls(evt));
        // scope.addWalls();
        this.controls.addEventListener('change', () => { scope.scene.needsUpdate = true; });
        animate();
    }

    addWalls() {
        var scope = this;
        let i = 0;

        // clear scene
        scope.floors3d.forEach((floor) => {
            floor.removeFromScene();
        });

        scope.edges3d.forEach((edge3d) => {
            edge3d.remove();
        });

        // for (i = 0; i < scope.walls3d.length; i++) {
        //     scope.scene.remove(scope.walls3d[i]);
        // }
        // scope.walls3d = [];

        scope.edges3d = [];
        let wallEdges = scope.floorplan.wallEdges();
        let rooms = scope.floorplan.getRooms();

        // draw floors
        for (i = 0; i < rooms.length; i++) {
            var threeFloor = new Floor3D(scope.scene, rooms[i]);
            scope.floors3d.push(threeFloor);
            threeFloor.addToScene();
        }

        for (i = 0; i < wallEdges.length; i++) {
            let edge3d = new Edge3D(scope.model.scene, wallEdges[i], scope.controls);
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
        scope.scene.needsUpdate = true;
    }

    render() {
        var scope = this;
        // scope.controls.update();
        if (!scope.scene.needsUpdate) {
            return;
        }
        scope.renderer.render(scope.scene.getScene(), scope.camera);
        scope.lastRender = Date.now();
        this.scene.needsUpdate = false;
    }

}