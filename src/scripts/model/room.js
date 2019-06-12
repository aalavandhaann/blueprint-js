import {EVENT_CHANGED, EVENT_ROOM_NAME_CHANGED} from '../core/events.js';
import {EventDispatcher, Vector2, Vector3, Face3, Geometry, Shape, ShapeGeometry, Mesh, MeshBasicMaterial, DoubleSide, Box3} from 'three';
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
		this._name = 'A New Room';
		this.min = null;
		this.max = null;
		this.center = null;
		this.area = 0.0;
		this.areaCenter = null;

		this.floorplan = floorplan;
		this.corners = corners;
		this.interiorCorners = [];
		this.edgePointer = null;
		this.floorPlane = null;
		this.roofPlane = null;
		this.customTexture = false;
		this.floorChangeCallbacks = null;
		this.updateWalls();
		this.updateInteriorCorners();
		this.generatePlane();
		this.generateRoofPlane();

		var cornerids = [];
		this.corners.forEach((corner)=>{
			corner.attachRoom(this);
			cornerids.push(corner.id);
		});
		this._roomByCornersId = cornerids.join(',');
	}

	get roomByCornersId()
	{
		return this._roomByCornersId;
	}

	set name(value)
	{
		var oldname = this._name;
		this._name = value;
		this.dispatchEvent({type:EVENT_ROOM_NAME_CHANGED, item:this, oldname: oldname, newname: this._name});
	}
	get name()
	{
		return this._name;
	}

	roomIdentifier()
	{
		var cornerids = [];
		this.corners.forEach((corner)=>{
				cornerids.push(corner.id);
		});
		var ids = cornerids.join(',');
		return ids;
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

	generateRoofPlane()
	{
		if(this.roofPlane && this.roofPlane != null)
		{
			if(this.roofPlane.parent != null)
			{
					this.roofPlane.parent.remove(this.roofPlane);
			}
		}
		// setup texture
		var geometry = new Geometry();

		this.corners.forEach((corner) => {
			var vertex = new Vector3(corner.x,corner.elevation, corner.y);
			geometry.vertices.push(vertex);
		});
		for (var i=2;i<geometry.vertices.length;i++)
		{
			var face = new Face3(0, i-1, i);
			geometry.faces.push(face);
		}
		this.roofPlane = new Mesh(geometry, new MeshBasicMaterial({side: DoubleSide, visible:false}));
		this.roofPlane.room = this;
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

		var b3 = new Box3();
		b3.setFromObject(this.floorPlane);
		this.min = b3.min.clone();
		this.max = b3.max.clone();
		this.center = this.max.clone().sub(this.min).multiplyScalar(0.5).add(this.min);
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

	pointInRoom(pt)
	{
		var polygon = [];
		this.corners.forEach((corner) => {
			var co = new Vector2(corner.x,corner.y);
			polygon.push(co);
		});
		return Utils.pointInPolygon2(pt, polygon);
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

	updateArea()
	{
		var points = [];
		this.area = 0;
		this.areaCenter = new Vector2();

		this.updateWalls();
		this.updateInteriorCorners();
		this.generatePlane();
		this.generateRoofPlane();

		this.corners.forEach((corner) => {
			var co = new Vector2(corner.x,corner.y);
			this.areaCenter.add(co);
			points.push(co);
		});
		this.areaCenter.multiplyScalar(1.0 / points.length);
		for (var i=0;i<points.length;i++)
		{
				var inext = (i+1 ) % points.length;
				var a = points[i];
				var b = points[inext];
				var ax_by = (a.x * b.y);
				var ay_bx = (a.y * b.x);
				var delta = ax_by - ay_bx;
				this.area += delta;

		}
		this.area = this.area;
		this.area = Math.abs(this.area) * 0.5;
	}

	hasAllCornersById(ids)
	{
		var sum = 0;
		for (var i=0;i<ids.length;i++)
		{
			 sum += this.hasACornerById(ids[i]);
		}
		return (sum == this.corners.length);
	}

	hasACornerById(id)
	{
		for (var i=0;i< this.corners.length;i++)
		{
			var corner = this.corners[i];
			if(corner.id == id)
			{
				return 1;
			}
		}
		return 0;
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
