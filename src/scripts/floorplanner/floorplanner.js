import $ from 'jquery';
import {EventDispatcher} from 'three';
import {EVENT_MODE_RESET, EVENT_LOADED} from '../core/events.js';
import {FloorplannerView, floorplannerModes} from './floorplanner_view.js';

/** how much will we move a corner to make a wall axis aligned (cm) */
export const snapTolerance = 25;
/**
 * The Floorplanner implements an interactive tool for creation of floorplans in
 * 2D.
 */
export class Floorplanner extends EventDispatcher
{
	/** */
	constructor(canvas, floorplan) 
	{
		super();
		/** */
		this.mode = 0;
		/** */
		this.activeWall = null;
		/** */
		this.activeCorner = null;
		/** */
		this.originX = 0;
		/** */
		this.originY = 0;
		/** drawing state */
		this.targetX = 0;
		/** drawing state */
		this.targetY = 0;
		/** drawing state */
		this.lastNode = null;
		/** */
		this.wallWidth = 0;
		/** */
		this.modeResetCallbacks = null;        

		/** */
		this.mouseDown = false;
		/** */
		this.mouseMoved = false;
		/** in ThreeJS coords */
		this.mouseX = 0;
		/** in ThreeJS coords */
		this.mouseY = 0;
		/** in ThreeJS coords */
		this.rawMouseX = 0;
		/** in ThreeJS coords */
		this.rawMouseY = 0;
		/** mouse position at last click */
		this.lastX = 0;
		/** mouse position at last click */
		this.lastY = 0;

		this.canvas = canvas;
		this.floorplan = floorplan;
		this.canvasElement = $('#' + canvas);
		this.view = new FloorplannerView(this.floorplan, this, canvas);
		var cmPerFoot = 30.48;
		var pixelsPerFoot = 15.0;
		this.cmPerPixel = cmPerFoot * (1.0 / pixelsPerFoot);
		this.pixelsPerCm = 1.0 / this.cmPerPixel;
		this.wallWidth = 10.0 * this.pixelsPerCm;
		
		this.gridsnapmode = false;
		this.shiftkey = false;
		// Initialization:

		this.setMode(floorplannerModes.MOVE);

		var scope = this;
		
//		this.canvasElement.mousedown((event) => {scope.mousedown(event);});
//		this.canvasElement.mousemove((event) => {scope.mousemove(event);});
//		this.canvasElement.mouseup((event) => {scope.mouseup(event);});
//		this.canvasElement.mouseleave((event) => {scope.mouseleave(event);});
		
		this.canvasElement.bind('touchstart mousedown', (event) => {scope.mousedown(event);});
		this.canvasElement.bind('touchmove mousemove', (event) => {scope.mousemove(event);});
		this.canvasElement.bind('touchend mouseup', (event) => {scope.mouseup(event);});
		this.canvasElement.bind('mouseleave', (event) => {scope.mouseleave(event);});
		
//		this.canvasElement[0].addEventListener('touchstart', function (e) {
//			var touch = e.touches[0];
//			var mouseEvent = new MouseEvent('mousedown', {clientX: touch.clientX,clientY: touch.clientY});
//			scope.canvasElement[0].dispatchEvent(mouseEvent);
//		}, false);
//		this.canvasElement[0].addEventListener('touchend', function () {
//			var mouseEvent = new MouseEvent('mouseup', {});
//			scope.canvasElement[0].dispatchEvent(mouseEvent);
//		}, false);
//		this.canvasElement[0].addEventListener('touchmove', function (e) {
//			var touch = e.touches[0];
//			var mouseEvent = new MouseEvent('mousemove', {clientX: touch.clientX,clientY: touch.clientY});
//			scope.canvasElement[0].dispatchEvent(mouseEvent);
//		}, false);
		
		
		$(document).keyup((e) => {
			if (e.keyCode == 27) 
			{
				scope.escapeKey();
			}
			scope.gridsnapmode = false;
			scope.shiftkey = false;
		});
		
		$(document).keydown((e) => 
		{
			if(e.shiftKey || e.keyCode == 65)
			{
				scope.shiftkey = true;
			}
			scope.gridsnapmode = e.shiftKey;			
		});
		floorplan.addEventListener(EVENT_LOADED, function(){scope.reset();});
	}

	/** */
	escapeKey() 
	{
		this.setMode(floorplannerModes.MOVE);
	}

	/** */
	updateTarget() 
	{
		if (this.mode == floorplannerModes.DRAW && this.lastNode) 
		{
			if (Math.abs(this.mouseX - this.lastNode.x) < snapTolerance) 
			{
				this.targetX = this.lastNode.x;
			} 
			else 
			{
				this.targetX = this.mouseX;
			}
			if (Math.abs(this.mouseY - this.lastNode.y) < snapTolerance) 
			{
				this.targetY = this.lastNode.y;
			} 
			else 
			{
				this.targetY = this.mouseY;
			}
		} 
		else 
		{
			this.targetX = this.mouseX;
			this.targetY = this.mouseY;
		}

		this.view.draw();
	}

	/** */
	mousedown() 
	{
		this.mouseDown = true;
		this.mouseMoved = false;
		if(event.touches)
		{
			this.rawMouseX = event.touches[0].clientX;
			this.rawMouseY = event.touches[0].clientY;
		}
		
		this.lastX = this.rawMouseX;
		this.lastY = this.rawMouseY;

		// delete
		if (this.mode == floorplannerModes.DELETE) 
		{
			if (this.activeCorner) 
			{
				this.activeCorner.removeAll();
			} 
			else if (this.activeWall) 
			{
				this.activeWall.remove();
			} 
			else 
			{
				//Continue the mode of deleting walls, this is necessary for deleting multiple walls
//				this.setMode(floorplannerModes.MOVE);
			}
		}
	}

	/** */
	mousemove(event) 
	{
		this.mouseMoved = true;

		if(event.touches)
		{
			event = event.touches[0];
		}
		
		// update mouse
		this.rawMouseX = event.clientX;
		this.rawMouseY = event.clientY;
		
		this.mouseX = (event.clientX - this.canvasElement.offset().left)  * this.cmPerPixel + this.originX * this.cmPerPixel;
		this.mouseY = (event.clientY - this.canvasElement.offset().top) * this.cmPerPixel + this.originY * this.cmPerPixel;
		
		
		// update target (snapped position of actual mouse)
		if (this.mode == floorplannerModes.DRAW || (this.mode == floorplannerModes.MOVE && this.mouseDown)) 
		{
			this.updateTarget();
		}

		// update object target
		if (this.mode != floorplannerModes.DRAW && !this.mouseDown) 
		{
			var hoverCorner = this.floorplan.overlappedCorner(this.mouseX, this.mouseY);
			var hoverWall = this.floorplan.overlappedWall(this.mouseX, this.mouseY);
			var draw = false;
			if (hoverCorner != this.activeCorner) 
			{
				this.activeCorner = hoverCorner;
				draw = true;
			}
			// corner takes precendence
			if (this.activeCorner == null) 
			{
				if (hoverWall != this.activeWall) 
				{
					this.activeWall = hoverWall;
					draw = true;
				}
			} 
			else 
			{
				this.activeWall = null;
			}
			if (draw) 
			{
				this.view.draw();
			}
		}

		// panning
		if (this.mouseDown && !this.activeCorner && !this.activeWall) 
		{
			this.originX += (this.lastX - this.rawMouseX);
			this.originY += (this.lastY - this.rawMouseY);
			this.lastX = this.rawMouseX;
			this.lastY = this.rawMouseY;
			this.view.draw();
		}

		// dragging
		if (this.mode == floorplannerModes.MOVE && this.mouseDown) 
		{
			if (this.activeCorner) 
			{
				this.activeCorner.move(this.mouseX, this.mouseY);
				if(this.shiftkey)
				{
					this.activeCorner.snapToAxis(snapTolerance);
				}				
			} 
			else if (this.activeWall) 
			{
				this.activeWall.relativeMove((this.rawMouseX - this.lastX) * this.cmPerPixel, (this.rawMouseY - this.lastY) * this.cmPerPixel);
				if(this.shiftkey)
				{
					this.activeWall.snapToAxis(snapTolerance);
				}				
				this.lastX = this.rawMouseX;
				this.lastY = this.rawMouseY;
			}
			this.view.draw();
		}
	}

	/** */
	mouseup() 
	{
		this.mouseDown = false;

		// drawing
		if (this.mode == floorplannerModes.DRAW && !this.mouseMoved) 
		{
			// This creates the corner already
			var corner = this.floorplan.newCorner(this.targetX, this.targetY);
			
			// further create a newWall based on the newly inserted corners
			// (one in the above line and the other in the previous mouse action
			// of start drawing a new wall)
			if (this.lastNode != null) 
			{
				this.floorplan.newWall(this.lastNode, corner);
				this.floorplan.newWallsForIntersections(this.lastNode, corner);
				this.view.draw();
			}
			if (corner.mergeWithIntersected() && this.lastNode != null) 
			{
				this.setMode(floorplannerModes.MOVE);
			}
			this.lastNode = corner;
		}
	}

	/** */
	mouseleave() 
	{
		this.mouseDown = false;
		// scope.setMode(scope.modes.MOVE);
	}

	/** */
	reset() 
	{
		this.resizeView();
		this.setMode(floorplannerModes.MOVE);
		this.resetOrigin();
		this.view.draw();
	}

	/** */
	resizeView() 
	{
		this.view.handleWindowResize();
	}

	/** */
	setMode(mode) 
	{
		this.lastNode = null;
		this.mode = mode;
		this.dispatchEvent({type:EVENT_MODE_RESET, mode: mode});
		// this.modeResetCallbacks.fire(mode);
		this.updateTarget();
	}

	/** Sets the origin so that floorplan is centered */
	resetOrigin() 
	{
		var centerX = this.canvasElement.innerWidth() / 2.0;
		var centerY = this.canvasElement.innerHeight() / 2.0;
		var centerFloorplan = this.floorplan.getCenter();
		this.originX = centerFloorplan.x * this.pixelsPerCm - centerX;
		this.originY = centerFloorplan.z * this.pixelsPerCm - centerY;
	}

	/** Convert from THREEjs coords to canvas coords. */
	convertX(x) 
	{
		return (x - this.originX * this.cmPerPixel) * this.pixelsPerCm;
	}

	/** Convert from THREEjs coords to canvas coords. */
	convertY(y)
	{
		return (y - this.originY * this.cmPerPixel) * this.pixelsPerCm;
	}
}