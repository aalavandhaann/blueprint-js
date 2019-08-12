import {EventDispatcher} from 'three';
import {EVENT_UPDATED} from '../core/events.js';
import {cmPerPixel, pixelsPerCm, Dimensioning} from '../core/dimensioning.js';
import {Configuration} from '../core/configuration.js';

/**
 * The View to be used by a Floorplanner to render in/interact with.
 */
export class CarbonSheet extends EventDispatcher
{
	constructor(floorplan, viewmodel, canvas)
	{
		super();
		this.canvasElement = document.getElementById(canvas);
		this.canvas = canvas;
		this.context = this.canvasElement.getContext('2d');
		this.floorplan = floorplan;
		this.viewmodel = viewmodel;
		
		this._url = '';
		this._image = new Image();
		
		this._loaded = false;
		this._transparency = 1.0;		
		this._x = this._y = 0.0;
		this._anchorX = 0;
		this._anchorY = 0;	
		//The values in pixels for width and height that will reflect the image's original size
		this._rawWidthPixels = this._rawHeightPixels = 1.0;
		//The values in cms for width and height that will reflect the images's original size
		this._rawWidth = this._rawHeight = 1.0;
		
		//The values in pixels for widht and height that will reflect the scaling of user to floorplan system 
		this._widthPixels = this._heightPixels = 1.0;
//		The values in cms for widht and height that will reflect the scaling of user to floorplan system 
		this._width = this._height = 1.0;
		
		this._drawWidthPixels = this._drawHeightPixels = 1.0;
		
		this._scaleX = this._scaleY = 1.0;
		this._maintainProportion = true;
		this._widthByHeightRatio = 1.0;
	}
	
	_calibrate()
	{
		if(!this._loaded)
		{
			return;
		}
		this._scaleX = this._widthPixels / this._rawWidthPixels;
		this._scaleY = this._heightPixels / this._rawHeightPixels;
		this._drawWidthPixels = this._rawWidthPixels * this._scaleX;
		this._drawHeightPixels = this._rawHeightPixels * this._scaleY;
	}
	
	_updated()
	{
		this.dispatchEvent({type: EVENT_UPDATED});
	}
	
	clear()
	{
		this._loaded = false;
		this._transparency = 1.0;		
		this._x = this._y = 0.0;
		this._anchorX = 0.0;
		this._anchorY = 0.0;			
		this._rawWidthPixels = this._rawHeightPixels = 1.0;
		this._rawWidth = this._rawHeight = 1.0;
		this._widthPixels = this._heightPixels = 1.0;
		this._width = this._height = 1.0;
		this._scaleX = this._scaleY = 1.0;
		this._drawWidthPixels = this._drawHeightPixels = 1.0;
	}
	
	set url(val)
	{
		if(!val || val == null)
		{
			return;
		}
		var scope = this;
		this._url = val;
		this._loaded = false;
		this._image.onload = function()
		{			
			scope._rawWidthPixels = this.width;
			scope._rawHeightPixels = this.height;
			scope._rawWidth = scope._rawWidthPixels * cmPerPixel;
			scope._rawHeight = scope._rawHeightPixels * cmPerPixel;
			
			scope._widthByHeightRatio = this.width / this.height;
			
			if(scope._widthPixels < 2.0)
			{
				scope._widthPixels = scope._rawWidthPixels;
				scope.width = Dimensioning.cmToMeasureRaw(scope._rawWidth);
			}	
			if(scope._heightPixels < 2.0)
			{
				scope._heightPixels = scope._rawHeightPixels;				
				scope.height = Dimensioning.cmToMeasureRaw(scope._rawHeight);
			}
			scope._loaded = true;
			scope._calibrate();
			scope._updated();
		}
		this._image.onerror = function()
		{
			scope._loaded = false;
			scope._url = '';
		}
		this._image.src = this._url;
	}
	
	get url()
	{
		return this._url;
	}
	
	set maintainProportion(flag)
	{
		this._maintainProportion = flag;
		this._updated();
	}
	
	get maintainProportion()
	{
		return this._maintainProportion;
	}
	
	get loaded()
	{
		return this._loaded;
	}
	
	set transparency(val)
	{
		this._transparency = val;
		this._updated();
	}
	
	get transparency()
	{
		return this._transparency;
	}
	
	set x(val)
	{
		this._x = val;
//		this._anchorX = val;
		this._updated();
	}
	
	get x()
	{
		return this._x;
	}
	
	set y(val)
	{
		this._y = val;
//		this._anchorY = val;
		this._updated();
	}
	
	get y()
	{
		return this._y;		
	}
	
	set anchorX(val)
	{
		this._anchorX = val;
		this._updated()
	}
	
	get anchorX()
	{
		return this._anchorX;
	}
	
	set anchorY(val)
	{
		this._anchorY = val;
		this._updated();
	}
	
	get anchorY()
	{
		return this._anchorY;
	}
	
	set width(val)
	{
		this._width = Dimensioning.cmFromMeasureRaw(val);
		this._widthPixels = this._width * pixelsPerCm;
		
		if(this._maintainProportion)
		{
			this._height = this._width / this._widthByHeightRatio;
			this._heightPixels = (this._height * pixelsPerCm);
		}
		
		this._calibrate();
		this._updated();
	}
	
	get width()
	{
		return Dimensioning.cmToMeasureRaw(this._width);
	}
	
	set height(val)
	{
		this._height = Dimensioning.cmFromMeasureRaw(val);
		this._heightPixels = this._height * pixelsPerCm;
		
		if(this._maintainProportion)
		{
			this._width = this._height * this._widthByHeightRatio;
			this._widthPixels = (this._width * pixelsPerCm);
		}
		
		this._calibrate();
		this._updated();
	}
	
	get height()
	{
		return Dimensioning.cmToMeasureRaw(this._height);
	}
	
	drawOriginCrossHair()
	{
		var ox = 0;
		var oy = 0;
		//draw origin crosshair
		this.context.fillStyle = '#FF0000';
		this.context.fillRect(ox-1.5, oy-15, 3, 30);
		this.context.fillRect(ox-15, oy-1.5, 30, 3);
//		this.context.lineWidth = 1;
//		this.context.strokeStyle = '#FF0000';
//		this.context.strokeRect(ox-1.5, oy-15, 1.5, 30);
//		this.context.strokeRect(ox-15, oy-1.5, 28, 1.5);
	}	

	/** */
	draw() 
	{
		if(this._loaded)
		{
			var conX = this.viewmodel.convertX(this._x);
			var conY = this.viewmodel.convertY(this._y);
			this.context.translate(conX, conY);
			
			this.context.globalAlpha = this._transparency;			
			this.context.drawImage(this._image, -this._anchorX*this._scaleX* Configuration.getNumericValue('scale'), -this._anchorY*this._scaleY* Configuration.getNumericValue('scale'), this._drawWidthPixels* Configuration.getNumericValue('scale'), this._drawHeightPixels* Configuration.getNumericValue('scale'));
			this.context.globalAlpha = 1.0;
			
			this.context.beginPath();			
			this.context.fillStyle = 'blue';
			this.context.arc(0, 0, 5, 0, 6.28);
			this.context.fill();
			this.context.closePath();
			this.drawOriginCrossHair();
			this.context.translate(-conX, -conY);
		}
			
	}
}