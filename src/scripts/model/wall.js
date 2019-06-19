import {EventDispatcher, Vector2} from 'three';
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
	constructor(start, end)
	{
		super();
		this.start = start;
		this.end = end;
		this.name = 'wall';

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
		var start = this.getStart();
		var end = this.getEnd();
		return Utils.distance(start, end);
	}

	wallCenter()
	{
		return new Vector2((this.getStart().x + this.getEnd().x) / 2.0, (this.getStart().y + this.getEnd().y) / 2.0);
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
		corner.attachStart(this);
		this.start = corner;
		this.fireMoved();
	}

	setEnd(corner)
	{
		this.end.detachWall(this);
		corner.attachEnd(this);
		this.end = corner;
		this.fireMoved();
	}

	distanceFrom(point)
	{
		return Utils.pointDistanceFromLine(point, new Vector2(this.getStartX(), this.getStartY()), new Vector2(this.getEndX(), this.getEndY()));
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
      if(point.distanceTo(startVector) < 10)
			{
				return this.start;
			}
			else if(point.distanceTo(endVector) < 10)
			{
				return this.end;
			}
			return null;
	}

	updateAttachedRooms()
	{
		if(this.start != null)
		{
			this.start.updateAttachedRooms();
		}
		if(this.end)
		{
			this.end.updateAttachedRooms();
		}
	}
}
