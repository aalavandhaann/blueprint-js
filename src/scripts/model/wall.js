import {EventDispatcher, Vector2} from 'three';
import Bezier from 'bezier-js';
import {WallTypes} from '../core/constants.js';
import {EVENT_ACTION,EVENT_MOVED,EVENT_DELETED} from '../core/events.js';
import {Configuration,configWallThickness,configWallHeight} from '../core/configuration.js';
import {Utils} from '../core/utils.js';


/** The default wall texture. */
export const defaultWallTexture = {url: 'rooms/textures/wallmap.png', stretch: true, scale: 0};

/**
 * A Wall is the basic element to create Rooms.
 *
 * Walls consists of two half edges.
 */
export class Wall extends EventDispatcher
{
	/**
	 * Constructs a new wall.
	 * @param start Start corner.
	 * @param end End corner.
	 */
	constructor(start, end, aa, bb)
	{
		super();
		this.start = start;
		this.end = end;
		this.name = 'wall';
		if(!aa && !bb)
		{
			this._walltype = WallTypes.STRAIGHT;
		}
		else
		{
			this._walltype = WallTypes.CURVED;
		}
		var o = new Vector2(0, 0);
		var abvector = end.location.clone().sub(start.location).multiplyScalar(0.5);
		
		var ab135plus = abvector.clone().rotateAround(o, Math.PI*0.75);
		var ab45plus = abvector.clone().rotateAround(o, Math.PI*0.25);
		
		if(aa)
		{
			this._a = new Vector2(0, 0);
			this._a.x = aa.x;
			this._a.y = aa.y;
		}
		else
		{
			this._a = start.location.clone().add(ab45plus);
		}
		
		if(bb)
		{
			this._b = new Vector2(0, 0);
			this._b.x = bb.x;
			this._b.y = bb.y;
		}
		else
		{
			this._b = end.location.clone().add(ab135plus);
		}		
		this._a_vector = this._a.clone().sub(start.location);
		this._b_vector = this._b.clone().sub(start.location);
		
		this._bezier = new Bezier(start.location.x,start.location.y , this._a.x,this._a.y , this._b.x,this._b.y , end.location.x,end.location.y);

		this.id = this.getUuid();

		this.start.attachStart(this);
		this.end.attachEnd(this);

		/** Front is the plane from start to end. */
		this.frontEdge = null;

		/** Back is the plane from end to start. */
		this.backEdge = null;

		/** */
		this.orphan = false;

		/** Items attached to this wall */
		this.items = [];

		/** */
		this.onItems = [];

		/** The front-side texture. */
		this.frontTexture = defaultWallTexture;

		/** The back-side texture. */
		this.backTexture = defaultWallTexture;

		/** Wall thickness. */
		this.thickness = Configuration.getNumericValue(configWallThickness);

		/** Wall height. */
		this.height = Configuration.getNumericValue(configWallHeight);

		/** Actions to be applied after movement. */
		this.moved_callbacks = null;

		/** Actions to be applied on removal. */
		this.deleted_callbacks = null;

		/** Actions to be applied explicitly. */
		this.action_callbacks = null;
		
//		this.start.addEventListener(EVENT_MOVED, ()=>{
//			scope.updateControlVectors();
//		});
//		this.end.addEventListener(EVENT_MOVED, ()=>{
//			scope.updateControlVectors();
//		});
		this.addCornerMoveListener(this.start);
		this.addCornerMoveListener(this.end);
	}
	
	addCornerMoveListener(corner, remove=false)
	{
		var scope = this;
		function moved()
		{
			scope.updateControlVectors();
		}
		
		if(remove)
		{
			corner.removeEventListener(EVENT_MOVED, moved);
			return;
		}
		corner.addEventListener(EVENT_MOVED, moved);
	}
	
	get a()
	{
		return this._a;
	}
	
	set a(location)
	{
		this._a.x = location.x;
		this._a.y = location.y;
		this._a_vector = this._a.clone().sub(this.start.location);
		this.updateControlVectors();
	}
	
	get b()
	{
		return this._b;
	}
	
	set b(location)
	{
		this._b.x = location.x;
		this._b.y = location.y;
		this._b_vector = this._b.clone().sub(this.start.location);
		this.updateControlVectors();
	}
	
	get aVector()
	{
		return this._a_vector.clone();
	}
	
	get bVector()
	{
		return this._b_vector.clone();
	}
	
	get bezier()
	{
		return this._bezier;
	}
	
	updateControlVectors()
	{
		this._bezier.points[0].x = this.start.location.x;
		this._bezier.points[0].y = this.start.location.y;
		
		this._bezier.points[1].x = this.a.x;
		this._bezier.points[1].y = this.a.y;
		
		this._bezier.points[2].x = this.b.x;
		this._bezier.points[2].y = this.b.y;
		
		this._bezier.points[3].x = this.end.location.x;
		this._bezier.points[3].y = this.end.location.y;
		this._bezier.update();
		if(this.getStart() || this.getEnd())
		{
			(this.getStart() != null) ? this.getStart().floorplan.update(false) : (this.getEnd() != null) ? this.getEnd().floorplan.update(false) : false;
		}		
//		this._a_vector = this._a.clone().sub(this.start.location);
//		this._b_vector = this._b.clone().sub(this.start.location);
	}

	getUuid()
	{
		return [this.start.id, this.end.id].join();
	}

	resetFrontBack()
	{
		this.frontEdge = null;
		this.backEdge = null;
		this.orphan = false;
	}
	
	snapToAxis(tolerance)
	{
		// order here is important, but unfortunately arbitrary
		this.start.snapToAxis(tolerance);
		this.end.snapToAxis(tolerance);
	}

	fireOnMove(func)
	{
		this.moved_callbacks.add(func);
	}

	fireOnDelete(func)
	{
		this.deleted_callbacks.add(func);
	}

	dontFireOnDelete(func)
	{
		this.deleted_callbacks.remove(func);
	}

	fireOnAction(func)
	{
		this.action_callbacks.add(func);
	}

	fireAction(action)
	{
		this.dispatchEvent({type:EVENT_ACTION, action: action});
		//this.action_callbacks.fire(action);
	}

	relativeMove(dx, dy)
	{
		this.start.relativeMove(dx, dy);
		this.end.relativeMove(dx, dy);
		
//		this.a = this.start.location.clone().add(this._a_vector);
//		this.b = this.start.location.clone().add(this._b_vector);
		
		this.updateControlVectors();
		
	}

	fireMoved()
	{
		this.dispatchEvent({type: EVENT_MOVED, item: this, position: null});
	}

	fireRedraw()
	{
		if (this.frontEdge)
		{
//			this.frontEdge.dispatchEvent({type: EVENT_REDRAW});
			this.frontEdge.dispatchRedrawEvent();
			//this.frontEdge.redrawCallbacks.fire();
		}
		if (this.backEdge)
		{
//			this.backEdge.dispatchEvent({type: EVENT_REDRAW});
			this.backEdge.dispatchRedrawEvent();
			//this.backEdge.redrawCallbacks.fire();
		}
	}
	
	set wallSize(value)
	{
		if(this.wallType == WallTypes.STRAIGHT)
		{
			var vector = this.getEnd().location.clone().sub(this.getStart().location);
			var currentLength = this.wallLength();
			var changeInLength = value / currentLength;
			
			var neighboursCountStart = (this.getStart().adjacentCorners().length == 1);
			var neighboursCountEnd = (this.getEnd().adjacentCorners().length  == 1);
			
			var changeInLengthOffset, movementVector, startPoint, endPoint;
			
			changeInLengthOffset = (changeInLength - 1);
			
			if((!neighboursCountStart && !neighboursCountEnd) || (neighboursCountStart && neighboursCountEnd))
			{
				changeInLengthOffset *= 0.5;
				movementVector = vector.clone().multiplyScalar(changeInLengthOffset);
				startPoint = movementVector.clone().multiplyScalar(-1).add(this.getStart().location);
				endPoint = movementVector.clone().add(this.getEnd().location);
			}
			else if(neighboursCountStart)
			{
				movementVector = vector.clone().multiplyScalar(changeInLengthOffset);
				startPoint = movementVector.clone().multiplyScalar(-1).add(this.getStart().location);
				endPoint = this.getEnd().location;
			}
			
			else if(neighboursCountEnd)
			{
				movementVector = vector.clone().multiplyScalar(changeInLengthOffset);
				endPoint = movementVector.clone().add(this.getEnd().location);
				startPoint = this.getStart().location;
			}
			this.getStart().move(startPoint.x, startPoint.y);
			this.getEnd().move(endPoint.x, endPoint.y);		
			
			this.updateAttachedRooms();
			
//			vector = vector.multiplyScalar(changeInLength).add(this.getStart().location);
//			this.getEnd().move(vector.x, vector.y);
		}
	}
	
	get wallSize()
	{
		return this.wallLength();
	}
		
	get wallType()
	{
		return this._walltype;
	}
	
	set wallType(value)
	{
		if(value == WallTypes.STRAIGHT || value == WallTypes.CURVED)
		{
			this._walltype = value;
		}
		this.updateControlVectors();
		this.updateAttachedRooms(true);
	}
	
	get startElevation()
	{
		if(this.start && this.start != null)
		{
			return this.start.elevation;
		}
		return 0.0;
	}
	
	get endElevation()
	{
		if(this.end && this.end != null)
		{
			return this.end.elevation;
		}
		return 0.0;
	}

	getStart()
	{
		return this.start;
	}

	getEnd()
	{
		return this.end;
	}

	getStartX()
	{
		return this.start.getX();
	}

	getEndX()
	{
		return this.end.getX();
	}

	getStartY()
	{
		return this.start.getY();
	}

	getEndY()
	{
		return this.end.getY();
	}

	wallLength()
	{
		if(this.wallType == WallTypes.STRAIGHT)
		{
			var start = this.getStart();
			var end = this.getEnd();
			return Utils.distance(start, end);
		}
		else if(this.wallType == WallTypes.CURVED)
		{
			return this._bezier.length();
		}
		return -1;
	}

	wallCenter()
	{
		if(this.wallType == WallTypes.STRAIGHT)
		{
			return new Vector2((this.getStart().x + this.getEnd().x) / 2.0, (this.getStart().y + this.getEnd().y) / 2.0);
		}
		else if(this.wallType == WallTypes.CURVED)
		{
			var p = this._bezier.get(0.5); 
			return new Vector2(p.x, p.y);
		}
		return new Vector2(0,0);
	}

	remove()
	{
		this.start.detachWall(this);
		this.end.detachWall(this);
		this.dispatchEvent({type:EVENT_DELETED, item: this});
		//this.deleted_callbacks.fire(this);
	}

	setStart(corner)
	{
		this.start.detachWall(this);
		this.addCornerMoveListener(this.start, true);
		
		corner.attachStart(this);
		this.start = corner;
		this.addCornerMoveListener(this.start);
		this.fireMoved();
	}

	setEnd(corner)
	{
		
		this.end.detachWall(this);
		this.addCornerMoveListener(this.end);
		
		corner.attachEnd(this);
		this.end = corner;
		this.addCornerMoveListener(this.end, true);
		this.fireMoved();
	}

	distanceFrom(point)
	{
		if(this.wallType == WallTypes.STRAIGHT)
		{
			return Utils.pointDistanceFromLine(point, new Vector2(this.getStartX(), this.getStartY()), new Vector2(this.getEndX(), this.getEndY()));
		}
		else if(this.wallType == WallTypes.CURVED)
		{
			var p = this._bezier.project(point);
			var projected = new Vector2(p.x, p.y);
			return projected.distanceTo(point);
		}
		return -1;
	}

	/** Return the corner opposite of the one provided.
	 * @param corner The given corner.
	 * @returns The opposite corner.
	 */
	oppositeCorner(corner)
	{
		if (this.start === corner)
		{
			return this.end;
		}
		else if (this.end === corner)
		{
			return this.start;
		}
		else
		{
			console.log('Wall does not connect to corner');
			return null;
		}
	}

	getClosestCorner(point)
	{
		var startVector = new Vector2(this.start.x, this.start.y);
		var endVector = new Vector2(this.end.x, this.end.y);
		var startDistance = point.distanceTo(startVector);
		var endDistance = point.distanceTo(endVector);
		if(startDistance <= (this.thickness*2))
		{
			return this.start;
		}
		else if(endDistance <= (this.thickness*2))
		{
			return this.end;
		}
		return null;
	}

	updateAttachedRooms(explicit=false)
	{
		if(this.start != null)
		{
			this.start.updateAttachedRooms(explicit);
		}
		if(this.end)
		{
			this.end.updateAttachedRooms(explicit);
		}
	}
}
