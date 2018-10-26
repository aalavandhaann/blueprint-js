import $ from 'jquery';
import {EventDispatcher, Vector2, Vector3, WebGLRenderer,ImageUtils, PerspectiveCamera, PCFSoftShadowMap} from 'three';
import {EVENT_UPDATED, EVENT_WALL_CLICKED, EVENT_NOTHING_CLICKED, EVENT_FLOOR_CLICKED, EVENT_ITEM_SELECTED, EVENT_ITEM_UNSELECTED} from '../core/events.js';


import {Controls} from './controls.js';
import {Controller} from './controller.js';
import {HUD} from './hud.js';
import {Floorplan} from './floorPlan.js';
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

		this.model = model;
		this.scene = model.scene;
		this.element = $(element);
		this.canvasElement = canvasElement;
		this.options = options;		

		this.domElement = null;
		this.camera = null;
		this.renderer = null;
		this.controller = null;

		this.needsUpdate = false;
		this.lastRender = Date.now();

		this.mouseOver = false;
		this.hasClicked = false;

		this.hud = null;

		this.controls = null;
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
		
		this.init();
	}
	
	init()
	{
		var scope = this;		
		ImageUtils.crossOrigin = '';

		scope.domElement = scope.element.get(0) ;// Container
//		scope.perspcamera = new PerspectiveCamera(45, 1, 1, 10000);
//		scope.orthocamera = new OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 10000);
		
		scope.camera = new PerspectiveCamera(45, 1, 1, 10000);
//		scope.camera = scope.perspcamera;
		scope.renderer = new WebGLRenderer({antialias: true, preserveDrawingBuffer: true}); // preserveDrawingBuffer:true - required to support .toDataURL()

		scope.renderer.autoClear = false;
		scope.renderer.shadowMap.enabled = true;
		scope.renderer.shadowMapSoft = true;
		scope.renderer.shadowMap.type = PCFSoftShadowMap;

		scope.skybox = new Skybox(scope.scene);
		
		scope.controls = new Controls(scope.camera, scope.domElement);
		scope.hud = new HUD(scope);
		scope.controller = new Controller(scope, scope.model, scope.camera, scope.element, scope.controls, scope.hud);

		scope.domElement.appendChild(scope.renderer.domElement);

		// handle window resizing
		scope.updateWindowSize();

		if (scope.options.resize)
		{        
			$(window).resize(() => {scope.updateWindowSize();});
		}
		// setup camera nicely
		scope.centerCamera();

//		model.floorplan.fireOnUpdatedRooms(scope.centerCamera);
		scope.model.floorplan.addEventListener(EVENT_UPDATED, this.updatedevent);
		
		scope.lights = new Lights(scope.scene, scope.model.floorplan);
		scope.floorplan = new Floorplan(scope.scene, scope.model.floorplan, scope.controls);
		
		var delay = 50;
		function animate() 
		{			
			setTimeout(function () {requestAnimationFrame(animate);}, delay);
			scope.render();
		}
		animate();
		scope.element.mouseenter(function () {scope.mouseOver = true;}).mouseleave(function () {scope.mouseOver = false;}).click(function () {scope.hasClicked = true;});
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
		if (scope.options.spin && !scope.mouseOver && !scope.hasClicked) 
		{
			var theta = 2 * Math.PI * scope.options.spinSpeed * (Date.now() - scope.lastRender);
			scope.controls.rotateLeft(theta);
			scope.controls.update();
		}
	}

	dataUrl() 
	{
		var dataUrl = this.renderer.domElement.toDataURL('image/png');
		return dataUrl;
	}

	stopSpin()
	{
		this.hasClicked = true;
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
	 * This method name conflicts with a variable so changing it to a different name
		needsUpdate() 
		{
			this.needsUpdate = true;
		}
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
		scope.camera.aspect = scope.elementWidth / scope.elementHeight;
		scope.camera.updateProjectionMatrix();
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
		//scope.controls.setOffset(offset);
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
	
	sceneGraph(obj)
	{
		console.group( ' <%o> ' + obj.name, obj );
		obj.children.forEach( this.sceneGraph );
		console.groupEnd();
	}

	render() 
	{
		var scope = this;
		scope.spin();
		if (scope.shouldRender()) 
		{
			scope.renderer.clear();
			scope.renderer.render(scope.scene.getScene(), scope.camera);
			scope.renderer.clearDepth();
			scope.renderer.render(scope.hud.getScene(), scope.camera);
		}
		scope.lastRender = Date.now();		
//		console.log('TOTaL OBJECTS IN THE SCENE ::: ', scope.scene.getScene().children.length);
	}
}
