import {EVENT_CHANGED} from '../core/events.js';
import {EventDispatcher, Vector2, Shape, ShapeGeometry, Mesh, MeshBasicMaterial, DoubleSide} from 'three';
import {Utils} from '../core/utils.js';
import {HalfEdge} from './half_edge.js';

/** Default texture to be used if nothing is provided. */
export const defaultRoomTexture = {url: 'rooms/textures/hardwood.png', scale: 400};

/** 
 * A Room is the combination of a Floorplan with a floor plane. 
 */
export class Room extends EventDispatcher
{
	/**
	 *  ordered CCW
	 */
	constructor(floorplan, corners) 
	{
		super();
		this.floorplan = floorplan;
		this.corners = corners;
		this.interiorCorners = [];
		this.edgePointer = null;
		this.floorPlane = null;
		this.customTexture = false;
		this.floorChangeCallbacks = null;
		this.updateWalls();
		this.updateInteriorCorners();
		this.generatePlane();
		
		this.corners.forEach((corner)=>{
			corner.attachRoom(this);
		});
		
	}

	getUuid() 
	{
		var cornerUuids = Utils.map(this.corners, function (c) {return c.id;});
		cornerUuids.sort();
		return cornerUuids.join();
	}

	fireOnFloorChange(callback) 
	{
		this.floorChangeCallbacks.add(callback);
	}

	getTexture() 
	{
		var uuid = this.getUuid();
		var tex = this.floorplan.getFloorTexture(uuid);
		return tex || defaultRoomTexture;
	}
	
	setRoomWallsTexture(textureUrl, textureStretch, textureScale)
	{
		var edge = this.edgePointer;
		var iterateWhile = true;
		edge.setTexture(textureUrl, textureStretch, textureScale);
		while (iterateWhile) 
		{
			if (edge.next === this.edgePointer) 
			{
				break;
			} 
			else 
			{
				edge = edge.next;
			}
			edge.setTexture(textureUrl, textureStretch, textureScale);
		}
	}

	/** 
	 * textureStretch always true, just an argument for consistency with walls
	 */
	setTexture(textureUrl, textureStretch, textureScale) 
	{
		var uuid = this.getUuid();	
		this.floorplan.setFloorTexture(uuid, textureUrl, textureScale);
		this.dispatchEvent({type:EVENT_CHANGED, item: this});
//		this.floorChangeCallbacks.fire();
	}

	generatePlane() 
	{
		var points = [];
		this.interiorCorners.forEach((corner) => {
			points.push(new Vector2(corner.x,corner.y));
		});
		var shape = new Shape(points);
		var geometry = new ShapeGeometry(shape);
		this.floorPlane = new Mesh(geometry, new MeshBasicMaterial({side: DoubleSide, visible:false}));
		//The below line was originally setting the plane visibility to false
		//Now its setting visibility to true. This is necessary to be detected
		//with the raycaster objects to click walls and floors.
		this.floorPlane.visible = true;
		this.floorPlane.rotation.set(Math.PI / 2, 0, 0);
		this.floorPlane.room = this; // js monkey patch
	}

	cycleIndex(index) 
	{
		if (index < 0) 
		{
			return index += this.corners.length;
		} 
		else 
		{
			return index % this.corners.length;
		}
	}

	updateInteriorCorners() 
	{
		var edge = this.edgePointer;
		var iterateWhile = true;
		while (iterateWhile) 
		{
			this.interiorCorners.push(edge.interiorStart());
			edge.generatePlane();
			if (edge.next === this.edgePointer) 
			{
				break;
			} 
			else 
			{
				edge = edge.next;
			}
		}
	}

	/** 
	 * Populates each wall's half edge relating to this room
	 * this creates a fancy doubly connected edge list (DCEL)
	 */
	updateWalls() 
	{

		var prevEdge = null;
		var firstEdge = null;

		for (var i = 0; i < this.corners.length; i++) 
		{

			var firstCorner = this.corners[i];
			var secondCorner = this.corners[(i + 1) % this.corners.length];

			// find if wall is heading in that direction
			var wallTo = firstCorner.wallTo(secondCorner);
			var wallFrom = firstCorner.wallFrom(secondCorner);
			var edge = null;
			if (wallTo) 
			{
				edge = new HalfEdge(this, wallTo, true);
			} 
			else if (wallFrom) 
			{
				edge = new HalfEdge(this, wallFrom, false);
			} 
			else 
			{
				// something horrible has happened
				console.log('corners arent connected by a wall, uh oh');
			}

			if (i == 0) 
			{
				firstEdge = edge;
			} 
			else 
			{
				edge.prev = prevEdge;
				prevEdge.next = edge;
				if (i + 1 == this.corners.length) 
				{
					firstEdge.prev = edge;
					edge.next = firstEdge;
				}
			}
			prevEdge = edge;
		}

		// hold on to an edge reference
		this.edgePointer = firstEdge;
	}
}
