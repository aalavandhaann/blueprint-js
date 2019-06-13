import $ from 'jquery';
import {EventDispatcher, Vector2, Vector3, WebGLRenderer,ImageUtils, PerspectiveCamera, OrthographicCamera} from 'three';
import {Plane} from 'three';
import {PCFSoftShadowMap} from 'three';
import {Clock} from 'three';
// import {FirstPersonControls} from './first-person-controls.js';
import {PointerLockControls} from './pointerlockcontrols.js';

import {EVENT_UPDATED, EVENT_WALL_CLICKED, EVENT_NOTHING_CLICKED, EVENT_FLOOR_CLICKED, EVENT_ITEM_SELECTED, EVENT_ITEM_UNSELECTED, EVENT_GLTF_READY} from '../core/events.js';
import {EVENT_CAMERA_ACTIVE_STATUS, EVENT_FPS_EXIT, EVENT_CAMERA_VIEW_CHANGE} from '../core/events.js';
import {VIEW_TOP, VIEW_FRONT, VIEW_RIGHT, VIEW_LEFT, VIEW_ISOMETRY} from '../core/constants.js';

import {OrbitControls} from './orbitcontrols.js';

// import {Controls} from './controls.js';
import {Controller} from './controller.js';
import {HUD} from './hud.js';
import {Floorplan3D} from './floorPlan.js';
import {Lights} from './lights.js';
import {Skybox} from './skybox.js';

export class Main extends EventDispatcher
{
	constructor(model, element, canvasElement, opts)
	{
		super();
		var options = {resize: true,pushHref: false,spin: true,spinSpeed: .00002,clickPan: true,canMoveFixedItems: false};
		for (var opt in options)
		{
			if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt))
			{
				options[opt] = opts[opt];
			}
		}

		this.pauseRender = true;
		this.model = model;
		this.scene = model.scene;
		this.element = $(element);
		this.canvasElement = canvasElement;
		this.options = options;

		this.domElement = null;
		this.orthocamera = null;
		this.perspectivecamera = null;
		this.camera = null;
		this.savedcameraposition = null;
		this.fpscamera = null;

		this.cameraNear = 10;
		this.cameraFar = 10000;

		this.controls = null;
		this.fpscontrols = null;
		this.fpsclock = new Clock(true);
		this.firstpersonmode = false;

		this.renderer = null;
		this.controller = null;

		this.needsUpdate = false;
		this.lastRender = Date.now();

		this.mouseOver = false;
		this.hasClicked = false;

		this.hud = null;

		this.heightMargin = null;
		this.widthMargin = null;
		this.elementHeight = null;
		this.elementWidth = null;


		this.itemSelectedCallbacks = $.Callbacks(); // item
		this.itemUnselectedCallbacks = $.Callbacks();

		this.wallClicked = $.Callbacks(); // wall
		this.floorClicked = $.Callbacks(); // floor
		this.nothingClicked = $.Callbacks();

		this.floorplan = null;

		var scope = this;
		this.updatedevent = ()=>{scope.centerCamera();};
		this.gltfreadyevent = (o)=>{scope.gltfReady(o);};

		this.clippingPlaneActive = new Plane(new Vector3(0, 0, 1), 0.0);
		this.clippingPlaneActive2 = new Plane(new Vector3(0, 0, -1), 0.0);
		this.globalClippingPlane = [this.clippingPlaneActive, this.clippingPlaneActive2];
		this.clippingEmpty = Object.freeze([]);
		this.clippingEnabled = false;

//		console.log('THIS ON MOBILE DEVICE ::: ', isMobile, isTablet);

		this.init();
	}

	getARenderer()
	{
// scope.renderer = new WebGLRenderer({antialias: true, preserveDrawingBuffer:
// true, alpha:true}); // preserveDrawingBuffer:true - required to support
// .toDataURL()
		var renderer = new WebGLRenderer({antialias: true, alpha:true});

// scope.renderer.autoClear = false;
		renderer.shadowMap.enabled = true;
		renderer.shadowMapSoft = true;
		renderer.shadowMap.type = PCFSoftShadowMap;
		renderer.setClearColor( 0xFFFFFF, 1 );
		renderer.clippingPlanes = this.clippingEmpty;
		renderer.localClippingEnabled = false;
//		renderer.setPixelRatio(window.devicePixelRatio);
// renderer.sortObjects = false;

		return renderer;
	}

	init()
	{
		var scope = this;
		ImageUtils.crossOrigin = '';

		var orthoScale = 100;
		var orthoWidth = window.innerWidth;
		var orthoHeight = window.innerHeight;

		scope.domElement = scope.element.get(0);

		scope.fpscamera = new PerspectiveCamera(60, 1, 1, 10000 );
		scope.perspectivecamera = new PerspectiveCamera(45, 10, scope.cameraNear, scope.cameraFar);
		scope.orthocamera = new OrthographicCamera(orthoWidth / -orthoScale, orthoWidth /orthoScale, orthoHeight /orthoScale, orthoHeight / -orthoScale, scope.cameraNear, scope.cameraFar);

		scope.camera = scope.perspectivecamera;
// scope.camera = scope.orthocamera;

		scope.renderer = scope.getARenderer();
		scope.domElement.appendChild(scope.renderer.domElement);

		scope.skybox = new Skybox(scope.scene, scope.renderer);

		scope.controls = new OrbitControls(scope.camera, scope.domElement);
		scope.controls.autoRotate = this.options['spin'];
		scope.controls.enableDamping = true;
		scope.controls.dampingFactor = 0.5;
		scope.controls.maxPolarAngle = Math.PI * 0.5;
		scope.controls.maxDistance = 3000;
		scope.controls.minZoom = 0.9;
		scope.controls.screenSpacePanning = true;

		scope.fpscontrols = new PointerLockControls(scope.fpscamera);
		scope.fpscontrols.characterHeight = 160;

		this.scene.add(scope.fpscontrols.getObject());
		this.fpscontrols.getObject().position.set(0, 200, 0);

		this.fpscontrols.addEventListener('unlock', function(){
			scope.switchFPSMode(false);
			scope.dispatchEvent({type:EVENT_FPS_EXIT});
		});


		scope.hud = new HUD(scope, scope.scene);
		scope.controller = new Controller(scope, scope.model, scope.camera, scope.element, scope.controls, scope.hud);

		// handle window resizing
		scope.updateWindowSize();

		if (scope.options.resize)
		{
			$(window).resize(() => {scope.updateWindowSize();});
		}
		// setup camera nicely
		scope.centerCamera();

		scope.model.floorplan.addEventListener(EVENT_UPDATED, this.updatedevent);
		scope.model.addEventListener(EVENT_GLTF_READY, this.gltfreadyevent);

		scope.lights = new Lights(scope.scene, scope.model.floorplan);
		scope.floorplan = new Floorplan3D(scope.scene, scope.model.floorplan, scope.controls);

		function animate()
		{
//			requestAnimationFrame(animate);
			scope.renderer.setAnimationLoop(function(){scope.render();});
			scope.render();
		}
		scope.switchFPSMode(false);
		animate();

		scope.element.mouseenter(function () {scope.mouseOver = true;}).mouseleave(function () {scope.mouseOver = false;}).click(function () {scope.hasClicked = true;});
	}
	exportForBlender()
	{
		this.skybox.setEnabled(false);
		this.controller.showGroundPlane(false);
		this.model.exportForBlender();
	}

	gltfReady(o)
	{
		this.dispatchEvent({type:EVENT_GLTF_READY, item: this, gltf: o.gltf});
		this.skybox.setEnabled(true);
		this.controller.showGroundPlane(true);
	}

	itemIsSelected(item)
	{
		this.dispatchEvent({type:EVENT_ITEM_SELECTED, item:item});
	}

	itemIsUnselected()
	{
		this.dispatchEvent({type:EVENT_ITEM_UNSELECTED});
	}

	wallIsClicked(wall)
	{
		this.dispatchEvent({type:EVENT_WALL_CLICKED, item:wall, wall:wall});
	}

	floorIsClicked(item)
	{
		this.dispatchEvent({type:EVENT_FLOOR_CLICKED, item:item});
	}

	nothingIsClicked()
	{
		this.dispatchEvent({type:EVENT_NOTHING_CLICKED});
	}

	spin()
	{
		var scope = this;
		scope.controls.autoRotate = scope.options.spin && !scope.mouseOver && !scope.hasClicked;
	}

	dataUrl()
	{
		var dataUrl = this.renderer.domElement.toDataURL('image/png');
		return dataUrl;
	}

	stopSpin()
	{
		this.hasClicked = true;
		this.controls.autoRotate = false;
	}

	options()
	{
		return this.options;
	}

	getModel()
	{
		return this.model;
	}

	getScene()
	{
		return this.scene;
	}

	getController()
	{
		return this.controller;
	}

	getCamera()
	{
		return this.camera;
	}


	/*
	 * This method name conflicts with a variable so changing it to a different
	 * name needsUpdate() { this.needsUpdate = true; }
	 */

	ensureNeedsUpdate()
	{
		this.needsUpdate = true;
	}

	rotatePressed()
	{
		this.controller.rotatePressed();
	}

	rotateReleased()
	{
		this.controller.rotateReleased();
	}

	setCursorStyle(cursorStyle)
	{
		this.domElement.style.cursor = cursorStyle;
	}

	updateWindowSize()
	{
		var scope = this;

		scope.heightMargin = scope.element.offset().top;
		scope.widthMargin = scope.element.offset().left;
		scope.elementWidth = scope.element.innerWidth();

		if (scope.options.resize)
		{
			scope.elementHeight = window.innerHeight - scope.heightMargin;
		}
		else
		{
			scope.elementHeight = scope.element.innerHeight();
		}

		scope.orthocamera.left = -window.innerWidth / 1.0;
		scope.orthocamera.right = window.innerWidth / 1.0;
		scope.orthocamera.top = window.innerHeight / 1.0;
		scope.orthocamera.bottom = -window.innerHeight / 1.0;
		scope.orthocamera.updateProjectionMatrix();

		scope.perspectivecamera.aspect = scope.elementWidth / scope.elementHeight;
		scope.perspectivecamera.updateProjectionMatrix();

		scope.fpscamera.aspect = scope.elementWidth / scope.elementHeight;
		scope.fpscamera.updateProjectionMatrix();

		scope.renderer.setSize(scope.elementWidth, scope.elementHeight);
		scope.needsUpdate = true;
	}

	centerCamera()
	{
		var scope = this;
		var yOffset = 150.0;
		var pan = scope.model.floorplan.getCenter();
		pan.y = yOffset;
		scope.controls.target = pan;
		var distance = scope.model.floorplan.getSize().z * 1.5;
		var offset = pan.clone().add(new Vector3(0, distance, distance));
		// scope.controls.setOffset(offset);
		scope.camera.position.copy(offset);
		scope.controls.update();
	}

	// projects the object's center point into x,y screen coords
	// x,y are relative to top left corner of viewer
	projectVector(vec3, ignoreMargin)
	{
		var scope = this;
		ignoreMargin = ignoreMargin || false;
		var widthHalf = scope.elementWidth / 2;
		var heightHalf = scope.elementHeight / 2;
		var vector = new Vector3();
		vector.copy(vec3);
		vector.project(scope.camera);

		var vec2 = new Vector2();
		vec2.x = (vector.x * widthHalf) + widthHalf;
		vec2.y = - (vector.y * heightHalf) + heightHalf;
		if (!ignoreMargin)
		{
			vec2.x += scope.widthMargin;
			vec2.y += scope.heightMargin;
		}
		return vec2;
	}

	sceneGraph(obj)
	{
		console.group( ' <%o> ' + obj.name, obj );
		obj.children.forEach( this.sceneGraph );
		console.groupEnd();
	}

	switchWireframe(flag)
	{
		this.model.switchWireframe(flag);
		this.floorplan.switchWireframe(flag);
		this.render(true);
	}

	pauseTheRendering(flag)
	{
		this.pauseRender = flag;
	}

	switchView(viewpoint)
	{
		var center = this.model.floorplan.getCenter();
		var size = this.model.floorplan.getSize();
		var distance = this.controls.object.position.distanceTo(this.controls.target);
		this.controls.target.copy(center);

		switch(viewpoint)
		{
		case VIEW_TOP:
			center.y = 1000;
			this.dispatchEvent({type:EVENT_CAMERA_VIEW_CHANGE, view: VIEW_TOP});
			break;
		case VIEW_FRONT:
			center.z = center.z - (size.z*0.5) - distance;
			this.dispatchEvent({type:EVENT_CAMERA_VIEW_CHANGE, view: VIEW_FRONT});
			break;
		case VIEW_RIGHT:
			center.x = center.x + (size.x*0.5) + distance;
			this.dispatchEvent({type:EVENT_CAMERA_VIEW_CHANGE, view: VIEW_RIGHT});
			break;
		case VIEW_LEFT:
			center.x = center.x - (size.x*0.5) - distance;
			this.dispatchEvent({type:EVENT_CAMERA_VIEW_CHANGE, view: VIEW_LEFT});
			break;
		case VIEW_ISOMETRY:
		default:
			center.x += distance;
			center.y += distance;
			center.z += distance;
			this.dispatchEvent({type:EVENT_CAMERA_VIEW_CHANGE, view: VIEW_ISOMETRY});
		}
		this.camera.position.copy(center);
		this.controls.dispatchEvent({type:EVENT_CAMERA_ACTIVE_STATUS});
		this.controls.needsUpdate = true;
		this.controls.update();
		this.render(true);
	}

	lockView(locked)
	{
		this.controls.enableRotate = locked;
		this.render(true);
	}

	// Send in a value between -1 to 1
	changeClippingPlanes(clipRatio, clipRatio2)
	{
		var size = this.model.floorplan.getSize();
		size.z = size.z + (size.z * 0.25);
		size.z = size.z * 0.5;
		this.clippingPlaneActive.constant = (this.model.floorplan.getSize().z * clipRatio);
		this.clippingPlaneActive2.constant = (this.model.floorplan.getSize().z * clipRatio2);

		if(!this.clippingEnabled)
		{
			this.clippingEnabled = true;
			this.renderer.clippingPlanes = this.globalClippingPlane;
		}
		this.controls.dispatchEvent({type:EVENT_CAMERA_ACTIVE_STATUS});
		this.controls.needsUpdate = true;
		this.controls.update();
		this.render(true);
	}

	resetClipping()
	{
		this.clippingEnabled = false;
		this.renderer.clippingPlanes = this.clippingEmpty;
		this.controls.needsUpdate = true;
		this.controls.update();
		this.render(true);
	}

	switchOrthographicMode(flag)
	{
		if(flag)
		{
			this.camera = this.orthocamera;
			this.camera.position.copy(this.perspectivecamera.position.clone());
			this.controls.object = this.camera;
			this.controller.changeCamera(this.camera);
			this.controls.needsUpdate = true;
			this.controls.update();
			this.render(true);
			return;
		}

		this.camera = this.perspectivecamera;
		this.camera.position.copy(this.orthocamera.position.clone());
		this.controls.object = this.camera;
		this.controller.changeCamera(this.camera);
		this.controls.needsUpdate = true;
		this.controls.update();
		this.render(true);
	}

	switchFPSMode(flag)
	{
		this.firstpersonmode = flag;
		this.fpscontrols.enabled = flag;
		this.controls.enabled = !flag;
		this.controller.enabled = !flag;
		this.controls.dispatchEvent({type:EVENT_CAMERA_ACTIVE_STATUS});

		if(flag)
		{
			this.skybox.toggleEnvironment(true);
			this.fpscontrols.lock();
		}
		else
		{
			this.skybox.toggleEnvironment(false);
			this.fpscontrols.unlock();
		}

		this.model.switchWireframe(false);
		this.floorplan.switchWireframe(false);
		this.render(true);
	}

	shouldRender()
	{
		var scope = this;
		// Do we need to draw a new frame
		if (scope.controls.needsUpdate || scope.controller.needsUpdate || scope.needsUpdate || scope.model.scene.needsUpdate)
		{
			scope.controls.needsUpdate = false;
			scope.controller.needsUpdate = false;
			scope.needsUpdate = false;
			scope.model.scene.needsUpdate = false;
			return true;
		}
		else
		{
			return false;
		}
	}

	rendervr()
	{

	}

	render(forced)
	{
		var scope = this;
		forced = (forced)? forced : false;
		if(this.pauseRender && !forced)
		{
			return;
		}

		scope.spin();
		if(scope.firstpersonmode)
		{
			scope.fpscontrols.update(scope.fpsclock.getDelta());
			scope.renderer.render(scope.scene.getScene(), scope.fpscamera);

		}
		else
		{
			if(this.shouldRender() || forced)
			{
				scope.renderer.render(scope.scene.getScene(), scope.camera);
			}
		}
		scope.lastRender = Date.now();
	}
}
