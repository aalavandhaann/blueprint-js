import {EventDispatcher, Vector2, Vector3} from 'three';
import $ from 'jquery';
import {EVENT_CAMERA_MOVED} from '../core/events.js';

/**
This file is a modified version of THREE.OrbitControls
Contributors:
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
export const STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

export class Controls extends EventDispatcher
{
	constructor(object, domElement)
	{
		super();
		this.object = object;
		this.domElement = (domElement !== undefined) ? domElement : $(document);
		// Set to false to disable this control
		this.enabled = true;
		// "target" sets the location of focus, where the control orbits around
		// and where it pans with respect to.
		this.target = new Vector3();
		// center is old, deprecated; use "target" instead
		this.center = this.target;
		// This option actually enables dollying in and out; left as "zoom" for
		// backwards compatibility
		this.noZoom = false;
		this.zoomSpeed = 1.0;
		// Limits to how far you can dolly in and out
		this.minDistance = 0;
		this.maxDistance = 2500; //Infinity;
		// Set to true to disable this control
		this.noRotate = false;
		this.rotateSpeed = 1.0;
		// Set to true to disable this control
		this.noPan = false;
		this.keyPanSpeed = 40.0;	// pixels moved per arrow key push
		// Set to true to automatically rotate around the target
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI / 2; // radians
		// Set to true to disable use of the keys
		this.noKeys = false;
		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };
		this.cameraMovedCallbacks = $.Callbacks();
		this.needsUpdate = true;

		// internals
//		var window = $(window);
		
		this.EPS = 0.000001;
		this.rotateStart = new Vector2();
		this.rotateEnd = new Vector2();
		this.rotateDelta = new Vector2();
		this.panStart = new Vector2();
		this.panEnd = new Vector2();
		this.panDelta = new Vector2();
		this.dollyStart = new Vector2();
		this.dollyEnd = new Vector2();
		this.dollyDelta = new Vector2();

		this.phiDelta = 0;
		this.thetaDelta = 0;
		this.scale = 1;
		this.pan = new Vector3();
		this.state = STATE.NONE;
		
		this.mouseupevent = (event) => {this.onMouseUp(event);};
		this.mousemoveevent = (event) => {this.onMouseMove(event);};
		this.mousedownevent = (event) => {this.onMouseDown(event);};
		this.mousewheelevent = (event) => {this.onMouseWheel(event);};
		this.touchstartevent = (event) => {this.touchstart(event);};
		this.touchendevent = (event) => {this.touchend(event);};
		this.touchmoveevent = (event) => {this.touchmove(event);};
		this.keydownevent = (event)=> {this.onKeyDown(event);};

		this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('mousedown', this.mousedownevent, false);
		this.domElement.addEventListener('mousewheel', this.mousewheelevent, false);
		this.domElement.addEventListener('DOMMouseScroll', this.mousewheelevent, false); // firefox
		this.domElement.addEventListener('touchstart', this.touchstartevent, false);
		this.domElement.addEventListener('touchend', this.touchendevent, false);
		this.domElement.addEventListener('touchmove', this.touchmoveevent, false);
		window.addEventListener('keydown', this.keydownevent, false);
	}

	controlsActive() 
	{
		return (this.state === STATE.NONE);
	}

	setPan(vec3) 
	{
		this.pan = vec3;
	}

	panTo(vec3)
	{
		var newTarget = new Vector3(vec3.x, this.target.y, vec3.z);
		var delta = this.target.clone().sub(newTarget);
		this.pan.sub(delta);
		this.update();
	}

	rotateLeft(angle) 
	{
		if (angle === undefined) 
		{
			angle = this.getAutoRotationAngle();
		}
		this.thetaDelta -= angle;
	}

	rotateUp(angle) 
	{
		if (angle === undefined) 
		{
			angle = this.getAutoRotationAngle();
		}
		this.phiDelta -= angle;
	}

	// pass in distance in world space to move left
	panLeft(distance) 
	{

		var panOffset = new Vector3();
		var te = this.object.matrix.elements;
		// get X column of matrix
		panOffset.set(te[0], 0, te[2]);
		panOffset.normalize();
		panOffset.multiplyScalar(-distance);
		this.pan.add(panOffset);

	}

	// pass in distance in world space to move up
	panUp(distance) 
	{
		var panOffset = new Vector3();
		var te = this.object.matrix.elements;
		// get Y column of matrix
		panOffset.set(te[4], 0, te[6]);
		panOffset.normalize();
		panOffset.multiplyScalar(distance);
		this.pan.add(panOffset);
	}

	// main entry point; pass in Vector2 of change desired in pixel space,
	// right and down are positive
//	Avoid the method name 'pan' this is conflicting with a variable name
//	pan(delta)
	updatePan(delta)
	{
		var element = (this.domElement === $(document)) ? this.domElement.body : this.domElement;
		if (this.object.fov !== undefined) 
		{
			// perspective
			var position = this.object.position;
			var offset = position.clone().sub(this.target);
			var targetDistance = offset.length();
			// half of the fov is center to top of screen
			targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);
			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			this.panLeft(2 * delta.x * targetDistance / element.clientHeight);
			this.panUp(2 * delta.y * targetDistance / element.clientHeight);
		} 
		else if (this.object.top !== undefined) 
		{
			// orthographic
			this.panLeft(delta.x * (this.object.right - this.object.left) / element.clientWidth);
			this.panUp(delta.y * (this.object.top - this.object.bottom) / element.clientHeight);
		} 
		else 
		{
			// camera neither orthographic or perspective - warn user
			console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
		}

		this.update();
	}

	panXY(x, y)
	{
//		this.pan(new Vector2(x, y));
		this.updatePan(new Vector2(x, y));
	}

	dollyIn(dollyScale) 
	{
		if (dollyScale === undefined) 
		{
			dollyScale = this.getZoomScale();
		}
		this.scale /= dollyScale;
	}

	dollyOut(dollyScale) 
	{
		if (dollyScale === undefined) 
		{
			dollyScale = this.getZoomScale();
		}
		this.scale *= dollyScale;
	}

	update() 
	{
		var position = this.object.position;
		var offset = position.clone().sub(this.target);

		// angle from z-axis around y-axis
		var theta = Math.atan2(offset.x, offset.z);
		// angle from y-axis
		var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);

		if (this.autoRotate) 
		{
			this.rotateLeft(this.getAutoRotationAngle());
		}

		theta += this.thetaDelta;
		phi += this.phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max(this.EPS, Math.min(Math.PI - this.EPS, phi));

		var radius = offset.length() * this.scale;

		// restrict radius to be between desired limits
		radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

		// move target to panned location
		this.target.add(this.pan);

		offset.x = radius * Math.sin(phi) * Math.sin(theta);
		offset.y = radius * Math.cos(phi);
		offset.z = radius * Math.sin(phi) * Math.cos(theta);

		position.copy(this.target).add(offset);

		this.object.lookAt(this.target);

		this.thetaDelta = 0;
		this.phiDelta = 0;
		this.scale = 1;
		this.pan.set(0, 0, 0);

//		this.cameraMovedCallbacks.fire();
		this.dispatchEvent({type:EVENT_CAMERA_MOVED});
		this.needsUpdate = true;
	}

	getAutoRotationAngle() 
	{
		return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
	}

	getZoomScale() 
	{
		return Math.pow(0.95, this.zoomSpeed);
	}

	onMouseDown(event)
	{
		if (this.enabled === false) { return; }
		event.preventDefault();

		if (event.button === 0) 
		{
			if (this.noRotate === true) { return; }
			this.state = STATE.ROTATE;
			this.rotateStart.set(event.clientX, event.clientY);
		} 
		else if (event.button === 1) 
		{
			if (this.noZoom === true) { return; }
			this.state = STATE.DOLLY;
			this.dollyStart.set(event.clientX, event.clientY);
		} 
		else if (event.button === 2) 
		{
			if (this.noPan === true) { return; }
			this.state = STATE.PAN;
			this.panStart.set(event.clientX, event.clientY);
		}
		// Greggman fix: https://github.com/greggman/three.js/commit/fde9f9917d6d8381f06bf22cdff766029d1761be
		this.domElement.addEventListener('mousemove', this.mousemoveevent, false);
		this.domElement.addEventListener('mouseup', this.mouseupevent, false);

	}

	onMouseMove(event) 
	{
		if (this.enabled === false) 
		{
			return;
		}

		event.preventDefault();
		var element = this.domElement === $(document) ? this.domElement.body : this.domElement;
		if (this.state === STATE.ROTATE) 
		{
			if (this.noRotate === true) 
			{
				return;
			}
			this.rotateEnd.set(event.clientX, event.clientY);
			this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
			// rotating across whole screen goes 360 degrees around
			this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);
			// rotating up and down along whole screen attempts to go 360, but limited to 180
			this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);
			this.rotateStart.copy(this.rotateEnd);
		} 
		else if (this.state === STATE.DOLLY) 
		{
			if (this.noZoom === true)
			{
				return; 
			}
			this.dollyEnd.set(event.clientX, event.clientY);
			this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
			if (this.dollyDelta.y > 0) 
			{
				this.dollyIn();
			} 
			else 
			{
				this.dollyOut();
			}
			this.dollyStart.copy(this.dollyEnd);

		} 
		else if (this.state === STATE.PAN) 
		{
			if (this.noPan === true) 
			{
				return;
			}
			this.panEnd.set(event.clientX, event.clientY);
			this.panDelta.subVectors(this.panEnd, this.panStart);
//			this.pan(this.panDelta);
			this.updatePan(this.panDelta);
			this.panStart.copy(this.panEnd);
		}
		// Greggman fix: https://github.com/greggman/three.js/commit/fde9f9917d6d8381f06bf22cdff766029d1761be
		this.update();
	}

	onMouseUp( /* event */) 
	{
		if (this.enabled === false)
		{
			return; 
		}
		// Greggman fix: https://github.com/greggman/three.js/commit/fde9f9917d6d8381f06bf22cdff766029d1761be
		this.domElement.removeEventListener('mousemove', this.mousemoveevent, false);
		this.domElement.removeEventListener('mouseup', this.mouseupevent, false);
		this.state = STATE.NONE;
	}

	onMouseWheel(event) 
	{
		if (this.enabled === false || this.noZoom === true)
		{
			return;
		}

		var delta = 0;
		if (event.wheelDelta) 
		{ 
			// WebKit / Opera / Explorer 9
			delta = event.wheelDelta;
		} 
		else if (event.detail) 
		{ 
			// Firefox
			delta = - event.detail;
		}

		if (delta > 0) 
		{
			this.dollyOut();
		} 
		else 
		{
			this.dollyIn();
		}
		this.update();
	}

	onKeyDown(event) 
	{

		if (this.enabled === false) 
		{ 
			return; 
		}
		if (this.noKeys === true) 
		{ 
			return; 
		}
		if (this.noPan === true) 
		{ 
			return; 
		}

		switch (event.keyCode) 
		{
		case this.keys.UP:
//			this.pan(new Vector2(0, this.keyPanSpeed));
			this.updatePan(new Vector2(0, this.keyPanSpeed));
			break;
		case this.keys.BOTTOM:
//			this.pan(new Vector2(0, -this.keyPanSpeed));
			this.updatePan(new Vector2(0, -this.keyPanSpeed));
			break;
		case this.keys.LEFT:
//			this.pan(new Vector2(this.keyPanSpeed, 0));
			this.updatePan(new Vector2(this.keyPanSpeed, 0));
			break;
		case this.keys.RIGHT:
//			this.pan(new Vector2(-this.keyPanSpeed, 0));
			this.updatePan(new Vector2(-this.keyPanSpeed, 0));
			break;
		}
	}

	touchstart(event) 
	{
		if (this.enabled === false) 
		{ 
			return; 
		}
		switch (event.touches.length) 
		{

		case 1:	// one-fingered touch: rotate
			if (this.noRotate === true) 
			{ 
				return; 
			}
			this.state = STATE.TOUCH_ROTATE;
			this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
			break;
		case 2:	// two-fingered touch: dolly
			if (this.noZoom === true) 
			{ 
				return; 
			}
			this.state = STATE.TOUCH_DOLLY;
			var dx = event.touches[0].pageX - event.touches[1].pageX;
			var dy = event.touches[0].pageY - event.touches[1].pageY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			this.dollyStart.set(0, distance);
			break;

		case 3: // three-fingered touch: pan
			if (this.noPan === true) 
			{ 
				return; 
			}
			this.state = STATE.TOUCH_PAN;
			this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);
			break;
		default:
			this.state = STATE.NONE;
		}
	}

	touchmove(event) 
	{
		if (this.enabled === false) 
		{ 
			return; 
		}
		event.preventDefault();
		event.stopPropagation();
		var element = this.domElement === $(document) ? this.domElement.body : this.domElement;

		switch (event.touches.length) 
		{
		case 1: // one-fingered touch: rotate
			if (this.noRotate === true) 
			{ 
				return; 
			}
			if (this.state !== STATE.TOUCH_ROTATE) 
			{ 
				return; 
			}
			this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
			this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
			// rotating across whole screen goes 360 degrees around
			this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);
			// rotating up and down along whole screen attempts to go 360, but limited to 180
			this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);
			this.rotateStart.copy(this.rotateEnd);
			break;

		case 2: // two-fingered touch: dolly
			if (this.noZoom === true) 
			{ 
				return; 
			}
			if (this.state !== STATE.TOUCH_DOLLY) 
			{ 
				return; 
			}
			var dx = event.touches[0].pageX - event.touches[1].pageX;
			var dy = event.touches[0].pageY - event.touches[1].pageY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			this.dollyEnd.set(0, distance);
			this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
			if (this.dollyDelta.y > 0) 
			{
				this.dollyOut();
			} 
			else 
			{
				this.dollyIn();
			}
			this.dollyStart.copy(this.dollyEnd);
			break;

		case 3: // three-fingered touch: pan
			if (this.noPan === true) 
			{ 
				return; 
			}
			if (this.state !== STATE.TOUCH_PAN) 
			{ 
				return; 
			}
			this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
			this.panDelta.subVectors(this.panEnd, this.panStart);
			this.pan(this.panDelta);
			this.panStart.copy(this.panEnd);
			break;
		default:
			this.state = STATE.NONE;
		}
	}

	touchend( /* event */) 
	{
		if (this.enabled === false)
		{
			return;
		}
		this.state = STATE.NONE;
	}	
}