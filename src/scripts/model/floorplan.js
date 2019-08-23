import {EVENT_UPDATED, EVENT_LOADED, EVENT_NEW, EVENT_DELETED, EVENT_ROOM_NAME_CHANGED} from '../core/events.js';
import {EVENT_CORNER_ATTRIBUTES_CHANGED, EVENT_WALL_ATTRIBUTES_CHANGED, EVENT_ROOM_ATTRIBUTES_CHANGED, EVENT_MOVED} from '../core/events.js';
import {EventDispatcher, Vector2, Vector3} from 'three';
import {Utils} from '../core/utils.js';
import {Dimensioning} from '../core/dimensioning.js';
import {WallTypes} from '../core/constants.js';
import {Version} from '../core/version.js';
import {cornerTolerance} from '../core/configuration.js';


import {HalfEdge} from './half_edge.js';
import {Corner} from './corner.js';
import {Wall} from './wall.js';
import {Room} from './room.js';

/** */
export const defaultFloorPlanTolerance = 10.0;

/**
 * A Floorplan represents a number of Walls, Corners and Rooms. This is an
 * abstract that keeps the 2d and 3d in sync
 */
export class Floorplan extends EventDispatcher
{
	/** Constructs a floorplan. */
	constructor()
	{
		super();
		/**
		 * List of elements of Wall instance
		 * 
		 * @property {Wall[]} walls Array of walls
		 * @type {Wall[]}
		 */
		this.walls = [];
		/**
		 * List of elements of Corner instance
		 * 
		 * @property {Corner[]} corners array of corners
		 * @type {Corner[]}
		 */
		this.corners = [];

		/**
		 * List of elements of Room instance
		 * 
		 * @property {Room[]} walls Array of walls
		 * @type {Room[]}
		 */
		this.rooms = [];

		/**
		 * An {@link Object} that stores the metadata of rooms like name
		 * 
		 * @property {Object} metaroomsdata stores the metadata of rooms like
		 *           name
		 * @type {Object}
		 */
		this.metaroomsdata = {};
		// List with reference to callback on a new wall insert event
		/**
		 * @deprecated
		 */
		this.new_wall_callbacks = [];
		// List with reference to callbacks on a new corner insert event
		/**
		 * @deprecated
		 */
		this.new_corner_callbacks = [];
		// List with reference to callbacks on redraw event
		/**
		 * @deprecated
		 */
		this.redraw_callbacks = [];
		// List with reference to callbacks for updated_rooms event
		/**
		 * @deprecated
		 */
		this.updated_rooms = [];
		// List with reference to callbacks for roomLoaded event
		/**
		 * @deprecated
		 */
		this.roomLoadedCallbacks = [];

		this.floorTextures = {};
		/**
		 * The {@link CarbonSheet} that handles the background image to show in
		 * the 2D view
		 * 
		 * @property {CarbonSheet} _carbonSheet The carbonsheet instance
		 * @type {Object}
		 */
		this._carbonSheet = null;
	}

	/**
	 * @param {CarbonSheet}
	 *            val
	 */
	set carbonSheet(val)
	{
		this._carbonSheet = val;
	}

	/**
	 * @return {CarbonSheet} _carbonSheet reference to the instance of
	 *         {@link CarbonSheet}
	 */
	get carbonSheet()
	{
		return this._carbonSheet;
	}

	/**
	 * @return {HalfEdge[]} edges The array of {@link HalfEdge}
	 */
	wallEdges()
	{
		var edges = [];
		this.walls.forEach((wall) => {
			if (wall.frontEdge)
			{
				edges.push(wall.frontEdge);
			}
			if (wall.backEdge)
			{
				edges.push(wall.backEdge);
			}
		});
		return edges;
	}

	/**
	 * Returns the roof planes in the floorplan for intersection testing
	 * 
	 * @return {Mesh[]} planes
	 * @see <https://threejs.org/docs/#api/en/objects/Mesh>
	 */
	roofPlanes()
	{
		var planes = [];
		this.rooms.forEach((room) => {
			planes.push(room.roofPlane);
		});
		return planes;
	}

	/**
	 * Returns all the planes for intersection for the walls
	 * 
	 * @return {Mesh[]} planes
	 * @see <https://threejs.org/docs/#api/en/objects/Mesh>
	 */
	wallEdgePlanes()
	{
		var planes = [];
		this.walls.forEach((wall) => {
			if (wall.frontEdge)
			{
				planes.push(wall.frontEdge.plane);
			}
			if (wall.backEdge)
			{
				planes.push(wall.backEdge.plane);
			}
		});
		return planes;
	}

	/**
	 * Returns all the planes for intersection of the floors in all room
	 * 
	 * @return {Mesh[]} planes
	 * @see <https://threejs.org/docs/#api/en/objects/Mesh>
	 */
	floorPlanes()
	{
		return Utils.map(this.rooms, (room) => {
			return room.floorPlane;
		});
	}

	fireOnNewWall(callback)
	{
		this.new_wall_callbacks.add(callback);
	}

	fireOnNewCorner(callback)
	{
		this.new_corner_callbacks.add(callback);
	}

	fireOnRedraw(callback)
	{
		this.redraw_callbacks.add(callback);
	}

	fireOnUpdatedRooms(callback)
	{
		this.updated_rooms.add(callback);
	}

	// This method needs to be called from the 2d floorplan whenever
	// the other method newWall is called.
	// This is to ensure that there are no floating walls going across
	// other walls. If two walls are intersecting then the intersection point
	// has to create a new wall.
	/**
	 * Checks existing walls for any intersections they would make. If there are
	 * intersections then introduce new corners and new walls as required at
	 * places
	 * 
	 * @param {Corner}
	 *            start
	 * @param {Corner}
	 *            end
	 * @return {boolean} intersects
	 */

	newWallsForIntersections(start, end)
	{
		var intersections = false;
		// This is a bug in the logic
		// When creating a new wall with a start and end
		// it needs to be checked if it is cutting other walls
		// If it cuts then all those walls have to removed and introduced as
		// new walls along with this new wall
		var cStart = new Vector2(start.getX(), start.getY());
		var cEnd = new Vector2(end.getX(), end.getY());
		var line = {p1: cStart, p2: cEnd};
		var newCorners = [];

		for (var i=0;i<this.walls.length;i++)
		{
			var twall = this.walls[i];
			var bstart = {x:twall.getStartX(), y:twall.getStartY()};
			var bend = {x:twall.getEndX(), y:twall.getEndY()};
			var iPoint;
			if(twall.wallType == WallTypes.CURVED)
			{
				iPoint = twall.bezier.intersects(line);
				if(iPoint.length)
				{
					iPoint = twall.bezier.get(iPoint[0]);
				}
			}
			else
			{
				iPoint = Utils.lineLineIntersectPoint(cStart, cEnd, bstart, bend);
			}
			if(iPoint)
			{
				var nCorner = this.newCorner(iPoint.x, iPoint.y);
				newCorners.push(nCorner);
				nCorner.mergeWithIntersected(false);
				intersections = true;
			}
		}
//		for( i=0;i<this.corners.length;i++)
//		{
//			var aCorner = this.corners[i];
//			if(aCorner)
//			{
//				aCorner.relativeMove(0, 0);
//				aCorner.snapToAxis(25);
//			}
//		}
//		this.update();
//		for( i=0;i<this.corners.length;i++)
//		{
//			aCorner = this.corners[i];
//			if(aCorner)
//			{
//				aCorner.relativeMove(0, 0);
//				aCorner.snapToAxis(25);
//			}
//		}
		this.update();
		
		return intersections;
	}

	/**
	 * Creates a new wall.
	 * 
	 * @param {Corner}
	 *            start The start corner.
	 * @param {Corner}
	 *            end The end corner.
	 * @returns {Wall} The new wall.
	 */
	newWall(start, end, a, b)
	{
		var scope = this;
		var wall = new Wall(start, end, a, b);
		
		this.walls.push(wall);
		wall.addEventListener(EVENT_DELETED, function(o){scope.removeWall(o.item);});
		wall.addEventListener(EVENT_WALL_ATTRIBUTES_CHANGED, function(o){
			scope.dispatchEvent(o);
		});
		
		this.dispatchEvent({type: EVENT_NEW, item: this, newItem: wall});
		this.update();
		return wall;
	}



	/**
	 * Creates a new corner.
	 * 
	 * @param {Number}
	 *            x The x coordinate.
	 * @param {Number}
	 *            y The y coordinate.
	 * @param {String}
	 *            id An optional id. If unspecified, the id will be created
	 *            internally.
	 * @returns {Corner} The new corner.
	 */
	newCorner(x, y, id)
	{
		var scope = this;
		var corner = new Corner(this, x, y, id);
		
		for (var i=0;i<this.corners.length;i++)
		{
				var existingCorner = this.corners[i];
				if(existingCorner.distanceFromCorner(corner) < cornerTolerance)
				{
					return existingCorner;
				}
		}
		
		this.corners.push(corner);
		corner.addEventListener(EVENT_DELETED, function(o)
				{scope.removeCorner(o.item);}
		);
		corner.addEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, function(o){
			scope.dispatchEvent(o);
			var updatecorners = o.item.adjacentCorners();
			updatecorners.push(o.item);
			scope.update(false, updatecorners);
//			scope.update(false);//For debug reasons
			});
		corner.addEventListener(EVENT_MOVED, function(o){
			scope.dispatchEvent(o);
			var updatecorners = o.item.adjacentCorners();
			updatecorners.push(o.item);
			scope.update(false, updatecorners);
//			scope.update(false);//For debug reasons
			});
		
		this.dispatchEvent({type: EVENT_NEW, item: this, newItem: corner});

		// This code has been added by #0K. There should be an update whenever a
		// new corner is inserted
		this.update();

		return corner;
	}

	/**
	 * Removes a wall.
	 * 
	 * @param {Wall}
	 *            wall The wall to be removed.
	 */
	removeWall(wall)
	{
		this.dispatchEvent({type: EVENT_DELETED, item: this, deleted: wall, item_type: 'wall'});
		Utils.removeValue(this.walls, wall);
		this.update();
	}

	/**
	 * Removes a corner.
	 * 
	 * @param {Corner}
	 *            corner The corner to be removed.
	 */
	removeCorner(corner)
	{
		this.dispatchEvent({type: EVENT_DELETED, item: this, deleted: corner, item_type: 'corner'});
		Utils.removeValue(this.corners, corner);
	}

	/**
	 * Gets the walls.
	 * 
	 * @return {Wall[]}
	 */
	getWalls()
	{
		return this.walls;
	}

	/**
	 * Gets the corners.
	 * 
	 * @return {Corner[]}
	 */
	getCorners()
	{
		return this.corners;
	}

	/**
	 * Gets the rooms.
	 * 
	 * @return {Room[]}
	 */
	getRooms()
	{
		return this.rooms;
	}

	/**
	 * Gets the room overlapping the location x, y.
	 * 
	 * @param {Number}
	 *            mx
	 * @param {Number}
	 *            my
	 * @return {Room}
	 */
	overlappedRoom(mx, my)
	{
			for (var i=0;i<this.rooms.length;i++)
			{
					var room = this.rooms[i];
					var flag = room.pointInRoom(new Vector2(mx, my));
					if(flag)
					{
						return room;
					}
			}

			return null;
	}
	
	/**
	 * Gets the Control of a Curved Wall overlapping the location x, y at a
	 * tolerance.
	 * 
	 * @param {Number}
	 *            x
	 * @param {Number}
	 *            y
	 * @param {Number}
	 *            tolerance
	 * @return {Corner}
	 */
	overlappedControlPoint(wall, x, y, tolerance)
	{
		tolerance = tolerance || defaultFloorPlanTolerance*5;
		if (wall.a.distanceTo(new Vector2(x, y)) < tolerance && wall.wallType == WallTypes.CURVED)
		{
			return wall.a;
		}
		
		else if (wall.b.distanceTo(new Vector2(x, y)) < tolerance && wall.wallType == WallTypes.CURVED)
		{
			return wall.b;
		}
		
		return null;
	}

	/**
	 * Gets the Corner overlapping the location x, y at a tolerance.
	 * 
	 * @param {Number}
	 *            x
	 * @param {Number}
	 *            y
	 * @param {Number}
	 *            tolerance
	 * @return {Corner}
	 */
	overlappedCorner(x, y, tolerance)
	{
		tolerance = tolerance || defaultFloorPlanTolerance;
		for (var i = 0; i < this.corners.length; i++)
		{
			if (this.corners[i].distanceFrom(new Vector2(x, y)) < tolerance)
			{
				return this.corners[i];
			}
		}
		return null;
	}

	/**
	 * Gets the Wall overlapping the location x, y at a tolerance.
	 * 
	 * @param {Number}
	 *            x
	 * @param {Number}
	 *            y
	 * @param {Number}
	 *            tolerance
	 * @return {Wall}
	 */
	overlappedWall(x, y, tolerance)
	{
		tolerance = tolerance || defaultFloorPlanTolerance;
		for (var i = 0; i < this.walls.length; i++)
		{
			var newtolerance = tolerance;// (tolerance+
											// ((this.walls[i].wallType ==
											// WallTypes.CURVED)*tolerance*10));
			if (this.walls[i].distanceFrom(new Vector2(x, y)) < newtolerance)
			{
				return this.walls[i];
			}
		}
		return null;
	}

	/**
	 * The metadata object with information about the rooms.
	 * 
	 * @return {Object} metaroomdata an object with room corner ids as key and
	 *         names as values
	 */
	getMetaRoomData()
	{
		  var metaRoomData = {};
			this.rooms.forEach((room)=>{
				var metaroom = {};
				// var cornerids = [];
				// room.corners.forEach((corner)=>{
				// cornerids.push(corner.id);
				// });
				// var ids = cornerids.join(',');
				var ids = room.roomByCornersId;
				metaroom['name'] = room.name;
				metaRoomData[ids] = metaroom;
			});
			return metaRoomData;
	}

	// Save the floorplan as a json object file
	/**
	 * @return {void}
	 */
	saveFloorplan()
	{
		var floorplans = {version:Version.getTechnicalVersion(), corners: {}, walls: [], rooms: {}, wallTextures: [], floorTextures: {}, newFloorTextures: {}, carbonSheet:{}};
		var cornerIds = [];
// writing all the corners based on the corners array
// is having a bug. This is because some walls have corners
// that aren't part of the corners array anymore. This is a quick fix
// by adding the corners to the json file based on the corners in the walls
// this.corners.forEach((corner) => {
// floorplans.corners[corner.id] = {'x': corner.x,'y': corner.y};
// });

		this.walls.forEach((wall) => {
			if(wall.getStart() && wall.getEnd())
			{
				floorplans.walls.push({
					'corner1': wall.getStart().id,
					'corner2': wall.getEnd().id,
					'frontTexture': wall.frontTexture,
					'backTexture': wall.backTexture,
					'wallType': wall.wallType.description,
					'a':{x: wall.a.x, y:wall.a.y},
					'b':{x: wall.b.x, y:wall.b.y},
				});
				cornerIds.push(wall.getStart());
				cornerIds.push(wall.getEnd());
			}
		});

		cornerIds.forEach((corner)=>{
			floorplans.corners[corner.id] = {'x': Dimensioning.cmToMeasureRaw(corner.x),'y': Dimensioning.cmToMeasureRaw(corner.y), 'elevation': Dimensioning.cmToMeasureRaw(corner.elevation)};
		});

// this.rooms.forEach((room)=>{
// var metaroom = {};
// var cornerids = [];
// room.corners.forEach((corner)=>{
// cornerids.push(corner.id);
// });
// var ids = cornerids.join(',');
// metaroom['name'] = room.name;
// floorplans.rooms[ids] = metaroom;
// });
		floorplans.rooms = this.metaroomsdata;

		if(this.carbonSheet)
		{
			floorplans.carbonSheet['url'] = this.carbonSheet.url;
			floorplans.carbonSheet['transparency'] = this.carbonSheet.transparency;
			floorplans.carbonSheet['x'] = this.carbonSheet.x;
			floorplans.carbonSheet['y'] = this.carbonSheet.y;
			floorplans.carbonSheet['anchorX'] = this.carbonSheet.anchorX;
			floorplans.carbonSheet['anchorY'] = this.carbonSheet.anchorY;
			floorplans.carbonSheet['width'] = this.carbonSheet.width;
			floorplans.carbonSheet['height'] = this.carbonSheet.height;
		}

		floorplans.newFloorTextures = this.floorTextures;
		return floorplans;
	}

	// Load the floorplan from a previously saved json object file
	/**
	 * @param {JSON}
	 *            floorplan
	 * @return {void}
	 * @emits {EVENT_LOADED}
	 */
	loadFloorplan(floorplan)
	{
		this.reset();		
		var corners = {};
		if (floorplan == null || !('corners' in floorplan) || !('walls' in floorplan))
		{
			return;
		}
		for (var id in floorplan.corners)
		{
			var corner = floorplan.corners[id];
			corners[id] = this.newCorner(Dimensioning.cmFromMeasureRaw(corner.x), Dimensioning.cmFromMeasureRaw(corner.y), id);
			if(corner.elevation)
			{
				corners[id].elevation = Dimensioning.cmFromMeasureRaw(corner.elevation);
			}
		}
		var scope = this;
		floorplan.walls.forEach((wall) => {
			var newWall = scope.newWall(corners[wall.corner1], corners[wall.corner2]);
			
			if (wall.frontTexture)
			{
				newWall.frontTexture = wall.frontTexture;
			}
			if (wall.backTexture)
			{
				newWall.backTexture = wall.backTexture;
			}
			// Adding of a, b, wallType (straight, curved) for walls happened
			// with introduction of 0.0.2a
			if(Version.isVersionHigherThan(floorplan.version, '0.0.2a'))
			{
				newWall.a = wall.a;
				newWall.b = wall.b;
				if(wall.wallType == 'CURVED')
				{
					newWall.wallType = WallTypes.CURVED;
				}
				else
				{
					newWall.wallType = WallTypes.STRAIGHT;
				}
			}
		});

		if ('newFloorTextures' in floorplan)
		{
			this.floorTextures = floorplan.newFloorTextures;
		}
		this.metaroomsdata = floorplan.rooms;
		this.update();

		if('carbonSheet' in floorplan)
		{
			this.carbonSheet.clear();
			this.carbonSheet.maintainProportion = false;
			this.carbonSheet.x = floorplan.carbonSheet['x'];
			this.carbonSheet.y = floorplan.carbonSheet['y'];
			this.carbonSheet.transparency = floorplan.carbonSheet['transparency'];
			this.carbonSheet.anchorX = floorplan.carbonSheet['anchorX'];
			this.carbonSheet.anchorY = floorplan.carbonSheet['anchorY'];
			this.carbonSheet.width = floorplan.carbonSheet['width'];
			this.carbonSheet.height = floorplan.carbonSheet['height'];
			this.carbonSheet.url = floorplan.carbonSheet['url'];
			this.carbonSheet.maintainProportion = true;
		}
		this.dispatchEvent({type: EVENT_LOADED, item: this});
// this.roomLoadedCallbacks.fire();
	}

	/**
	 * @deprecated
	 */
	getFloorTexture(uuid)
	{
		if (uuid in this.floorTextures)
		{
			return this.floorTextures[uuid];
		}
		return null;
	}

	/**
	 * @deprecated
	 */
	setFloorTexture(uuid, url, scale)
	{
		this.floorTextures[uuid] = {url: url,scale: scale};
	}

	/** clear out obsolete floor textures */
	/**
	 * @deprecated
	 */
	updateFloorTextures()
	{
		var uuids = Utils.map(this.rooms, function (room){return room.getUuid();});
		for (var uuid in this.floorTextures)
		{
			if (!Utils.hasValue(uuids, uuid))
			{
				delete this.floorTextures[uuid];
			}
		}
	}

	/**
	 * Resets the floorplan data to empty
	 * 
	 * @return {void}
	 */
	reset()
	{
		var tmpCorners = this.corners.slice(0);
		var tmpWalls = this.walls.slice(0);
		tmpCorners.forEach((corner) => {
			corner.remove();
		});
		tmpWalls.forEach((wall) => {
			wall.remove();
		});
		this.corners = [];
		this.walls = [];
	}

	/**
	 * @param {Object}
	 *            event
	 * @listens {EVENT_ROOM_NAME_CHANGED} When a room name is changed and
	 *          updates to metaroomdata
	 */
	roomNameChanged(e)
	{
			if(this.metaroomsdata)
			{
					this.metaroomsdata[e.item.roomByCornersId] = e.newname;
			}
	}

	/**
	 * Update the floorplan with new rooms, remove old rooms etc.
	 */
	update(updateroomconfiguration = true, updatecorners=null)//Should include for , updatewalls=null, updaterooms=null
	{
		if(updatecorners!=null)
		{
//			console.log('UPDATE CORNER ANGLES ::: ', updatecorners.length);
			updatecorners.forEach((corner)=>{
				corner.updateAngles();
			})
		} 
		
		if(!updateroomconfiguration)
		{
			this.dispatchEvent({type: EVENT_UPDATED, item: this});
			return;			
		}
		
//		console.log('UPDATE ROOM WITH NEW ENTRIES ::: ');
		
		var scope = this;
		this.walls.forEach((wall) => {
			wall.resetFrontBack();
		});

		// this.rooms.forEach((room)=>{room.removeEventListener(EVENT_ROOM_NAME_CHANGED,
		// scope.roomNameChanged)});

		var roomCorners = this.findRooms(this.corners);
		this.rooms = [];


		this.corners.forEach((corner)=>{
			corner.clearAttachedRooms();
//			corner.updateAngles();
		});

		roomCorners.forEach((corners) =>
		{
			var room = new Room(scope, corners);
			room.updateArea();
			scope.rooms.push(room);
			
			room.addEventListener(EVENT_ROOM_NAME_CHANGED, (e)=>{scope.roomNameChanged(e);});
			room.addEventListener(EVENT_ROOM_ATTRIBUTES_CHANGED, function(o){
				var room = o.item;
				scope.dispatchEvent(o);				
				if(scope.metaroomsdata[room.roomByCornersId])
				{
					scope.metaroomsdata[room.roomByCornersId]['name'] = room.name;
				}
				else
				{
					scope.metaroomsdata[room.roomByCornersId] = {};
					scope.metaroomsdata[room.roomByCornersId]['name'] = room.name;
				}
			});
			
			if(scope.metaroomsdata)
			{				
				if(scope.metaroomsdata[room.roomByCornersId])
				{
					room.name = scope.metaroomsdata[room.roomByCornersId]['name'];
				}
			}
		});				
		this.assignOrphanEdges();
		this.updateFloorTextures();
		this.dispatchEvent({type: EVENT_UPDATED, item: this});
// console.log('TOTAL WALLS ::: ', this.walls.length);
	}

	/**
	 * Returns the center of the floorplan in the y plane
	 * 
	 * @return {Vector2} center
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	getCenter()
	{
		return this.getDimensions(true);
	}

	/**
	 * Returns the bounding volume of the full floorplan
	 * 
	 * @return {Vector3} size
	 * @see https://threejs.org/docs/#api/en/math/Vector3
	 */
	getSize()
	{
		return this.getDimensions(false);
	}

	/**
	 * Returns the bounding size or the center location of the full floorplan
	 * 
	 * @param {boolean}
	 *            center If true return the center else the size
	 * @return {Vector3} size
	 * @see https://threejs.org/docs/#api/en/math/Vector3
	 */
	getDimensions(center)
	{
		center = center || false; // otherwise, get size

		var xMin = Infinity;
		var xMax = -Infinity;
		var zMin = Infinity;
		var zMax = -Infinity;
		this.corners.forEach((corner) => {
			if (corner.x < xMin) xMin = corner.x;
			if (corner.x > xMax) xMax = corner.x;
			if (corner.y < zMin) zMin = corner.y;
			if (corner.y > zMax) zMax = corner.y;
		});
		var ret;
		if (xMin == Infinity || xMax == -Infinity || zMin == Infinity || zMax == -Infinity)
		{
			ret = new Vector3();
		}
		else
		{
			if (center)
			{
				// center
				ret = new Vector3((xMin + xMax) * 0.5, 0, (zMin + zMax) * 0.5);
			}
			else
			{
				// size
				ret = new Vector3((xMax - xMin), 0, (zMax - zMin));
			}
		}
		return ret;
	}

	/**
	 * An internal cleanup method
	 */
	assignOrphanEdges()
	{
		// kinda hacky
		// find orphaned wall segments (i.e. not part of rooms) and
		// give them edges
		var orphanWalls = [];
		this.walls.forEach((wall) => {
			if (!wall.backEdge && !wall.frontEdge)
			{
				wall.orphan = true;
				var back = new HalfEdge(null, wall, false);
				var front = new HalfEdge(null, wall, true);
				back.generatePlane();
				front.generatePlane();
				orphanWalls.push(wall);
			}
		});
	}

	/**
	 * Find the "rooms" in our planar straight-line graph. Rooms are set of the
	 * smallest (by area) possible cycles in this graph.
	 * 
	 * @param corners
	 *            The corners of the floorplan.
	 * @returns The rooms, each room as an array of corners.
	 * @param {Corners[]}
	 *            corners
	 * @return {Corners[][]} loops
	 */
	findRooms(corners)
	{

		function _calculateTheta(previousCorner, currentCorner, nextCorner)
		{
			var theta = Utils.angle2pi(new Vector2(previousCorner.x - currentCorner.x, previousCorner.y - currentCorner.y), new Vector2(nextCorner.x - currentCorner.x, nextCorner.y - currentCorner.y));
			return theta;
		}

		function _removeDuplicateRooms(roomArray)
		{
			var results = [];
			var lookup = {};
			var hashFunc = function (corner)
			{
				return corner.id;
			};
			var sep = '-';
			for (var i = 0; i < roomArray.length; i++)
			{
				// rooms are cycles, shift it around to check uniqueness
				var add = true;
				var room = roomArray[i];
				for (var j = 0; j < room.length; j++)
				{
					var roomShift = Utils.cycle(room, j);
					var str = Utils.map(roomShift, hashFunc).join(sep);
					if (lookup.hasOwnProperty(str))
					{
						add = false;
					}
				}
				if (add)
				{
					results.push(roomArray[i]);
					lookup[str] = true;
				}
			}
			return results;
		}

		/**
		 * An internal method to find rooms based on corners and their
		 * connectivities
		 */
		function _findTightestCycle(firstCorner, secondCorner)
		{
			var stack = [];
			var next = {corner: secondCorner,previousCorners: [firstCorner]};
			var visited = {};
			visited[firstCorner.id] = true;

			while (next)
			{
				// update previous corners, current corner, and visited corners
				var currentCorner = next.corner;
				visited[currentCorner.id] = true;

				// did we make it back to the startCorner?
				if (next.corner === firstCorner && currentCorner !== secondCorner)
				{
					return next.previousCorners;
				}

				var addToStack = [];
				var adjacentCorners = next.corner.adjacentCorners();
				for (var i = 0; i < adjacentCorners.length; i++)
				{
					var nextCorner = adjacentCorners[i];

					// is this where we came from?
					// give an exception if its the first corner and we aren't
					// at the second corner
					if (nextCorner.id in visited && !(nextCorner === firstCorner && currentCorner !== secondCorner))
					{
						continue;
					}

					// nope, throw it on the queue
					addToStack.push(nextCorner);
				}

				var previousCorners = next.previousCorners.slice(0);
				previousCorners.push(currentCorner);
				if (addToStack.length > 1)
				{
					// visit the ones with smallest theta first
					var previousCorner = next.previousCorners[next.previousCorners.length - 1];
					addToStack.sort(function (a, b){return (_calculateTheta(previousCorner, currentCorner, b) - _calculateTheta(previousCorner, currentCorner, a));});
				}

				if (addToStack.length > 0)
				{
					// add to the stack
					addToStack.forEach((corner) => {
						stack.push({ corner: corner, previousCorners: previousCorners});
					});
				}

				// pop off the next one
				next = stack.pop();
			}
			return [];
		}

		// find tightest loops, for each corner, for each adjacent
		// TODO: optimize this, only check corners with > 2 adjacents, or
		// isolated cycles
		var loops = [];

		corners.forEach((firstCorner) => {
			firstCorner.adjacentCorners().forEach((secondCorner) => {
				loops.push(_findTightestCycle(firstCorner, secondCorner));
			});
		});

		// remove duplicates
		var uniqueLoops = _removeDuplicateRooms(loops);
		// remove CW loops
		var uniqueCCWLoops = Utils.removeIf(uniqueLoops, Utils.isClockwise);
		return uniqueCCWLoops;
	}
}
