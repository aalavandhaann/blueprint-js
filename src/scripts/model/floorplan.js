import {EVENT_UPDATED, EVENT_LOADED, EVENT_NEW, EVENT_DELETED} from '../core/events.js';
import {EventDispatcher, Vector2, Vector3} from 'three';
import {Utils} from '../core/utils.js';
import {HalfEdge} from './half_edge.js';
import {Corner} from './corner.js';
import {Wall} from './wall.js';
import {Room} from './room.js';

/** */
export const defaultFloorPlanTolerance = 10.0;

/** 
 * A Floorplan represents a number of Walls, Corners and Rooms. This is an abstract that keeps the 2d and 3d in sync
 **/
export class Floorplans extends EventDispatcher
{
	/** Constructs a floorplan. */
	constructor() 
	{
		super();
		//List of elements of Wall instance
		this.walls = [];
		//List of elements of Corner instance
		this.corners = [];
		//List of elements of Room instance
		this.rooms = [];
		//List with reference to callback on a new wall insert event
		this.new_wall_callbacks = [];
		//List with reference to callbacks on a new corner insert event
		this.new_corner_callbacks = [];
		//List with reference to callbacks on redraw event
		this.redraw_callbacks = [];
		//List with reference to callbacks for updated_rooms event
		this.updated_rooms = [];
		//List with reference to callbacks for roomLoaded event
		this.roomLoadedCallbacks = [];
		this.floorTextures = {};
	}

	// hack
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

	// hack
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

	/**
	 * Creates a new wall.
	 * @param start The start corner.
	 * @param end he end corner.
	 * @returns The new wall.
	 */
	newWall(start, end) 
	{
		for (var i=0;i<this.walls.length;i++)
		{
			var twall = this.walls[i];
			var bstart = {x:twall.getStartX(), y:twall.getStartY()};
			var bend = {x:twall.getEndX(), y:twall.getEndY()};
			var intersects = Utils.lineLineIntersect(start, end, bstart, bend);
			console.log('INTERSECTION RESULT :: ', intersects);
		}
		//This is a bug in the logic
		//When creating a new wall with a start and end
		//it needs to be checked if it is cutting other walls
		//If it cuts then all those walls have to removed and introduced as 
		//new walls along with this new wall
		var wall = new Wall(start, end);
		this.walls.push(wall);
		var scope = this;
		wall.addEventListener(EVENT_DELETED, function(o){scope.removeWall(o.item);});
//		wall.fireOnDelete(() => {
//		scope.removeWall(wall);
//		});

		this.dispatchEvent({type: EVENT_NEW, item: this, newItem: wall});
//		this.new_wall_callbacks.fire(wall);

		this.update();
		return wall;
	}
	
	/**
	 * Creates a new corner.
	 * @param x The x coordinate.
	 * @param y The y coordinate.
	 * @param id An optional id. If unspecified, the id will be created internally.
	 * @returns The new corner.
	 */
	newCorner(x, y, id)
	{
		var corner = new Corner(this, x, y, id);
		var scope = this;
		this.corners.push(corner);

		corner.addEventListener(EVENT_DELETED, function(o){scope.removeCorner(o.item);});
//		corner.fireOnDelete(() => {
//		this.removeCorner;
//		});

		this.dispatchEvent({type: EVENT_NEW, item: this, newItem: corner});
//		this.new_corner_callbacks.fire(corner);
		return corner;
	}

	/** Removes a wall.
	 * @param wall The wall to be removed.
	 */
	removeWall(wall)
	{
		Utils.removeValue(this.walls, wall);
		this.update();
	}	

	/** Removes a corner.
	 * @param corner The corner to be removed.
	 */
	removeCorner(corner) 
	{
		Utils.removeValue(this.corners, corner);
	}

	/** Gets the walls. */
	getWalls() 
	{
		return this.walls;
	}

	/** Gets the corners. */
	getCorners() 
	{
		return this.corners;
	}

	/** Gets the rooms. */
	getRooms() 
	{
		return this.rooms;
	}

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

	overlappedWall(x, y, tolerance)
	{
		tolerance = tolerance || defaultFloorPlanTolerance;
		for (var i = 0; i < this.walls.length; i++) 
		{
			if (this.walls[i].distanceFrom(new Vector2(x, y)) < tolerance) 
			{
				return this.walls[i];
			}
		}
		return null;
	}

	// import and export -- cleanup

	saveFloorplan() 
	{
		var floorplans = {corners: {}, walls: [], wallTextures: [], floorTextures: {},newFloorTextures: {}};

		this.corners.forEach((corner) => {
			floorplans.corners[corner.id] = {'x': corner.x,'y': corner.y};
		});

		this.walls.forEach((wall) => {
			floorplans.walls.push({
				'corner1': wall.getStart().id,
				'corner2': wall.getEnd().id,
				'frontTexture': wall.frontTexture,
				'backTexture': wall.backTexture
			});
		});
		floorplans.newFloorTextures = this.floorTextures;
		return floorplans;
	}

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
			corners[id] = this.newCorner(corner.x, corner.y, id);
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
		});

		if ('newFloorTextures' in floorplan) 
		{
			this.floorTextures = floorplan.newFloorTextures;
		}

		this.update();
		this.dispatchEvent({type: EVENT_LOADED, item: this});
//		this.roomLoadedCallbacks.fire();
	}

	getFloorTexture(uuid) 
	{
		if (uuid in this.floorTextures) 
		{
			return this.floorTextures[uuid];
		}
		return null;
	}

	setFloorTexture(uuid, url, scale) 
	{
		this.floorTextures[uuid] = {url: url,scale: scale};
	}

	/** clear out obsolete floor textures */
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

	/** */
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
	 * Update rooms
	 */
	update() 
	{
		this.walls.forEach((wall) => {
			wall.resetFrontBack();
		});

		var roomCorners = this.findRooms(this.corners);
		this.rooms = [];
		var scope = this;
		roomCorners.forEach((corners) => {
			scope.rooms.push(new Room(scope, corners));
		});
		this.assignOrphanEdges();
		this.updateFloorTextures();
		this.dispatchEvent({type: EVENT_UPDATED, item: this});
//		this.updated_rooms.fire();
	}

	/** 
	 * Returns the center of the floorplan in the y plane
	 */
	getCenter() 
	{
		return this.getDimensions(true);
	}

	getSize() 
	{
		return this.getDimensions(false);
	}

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

	/*
	 * Find the "rooms" in our planar straight-line graph.
	 * Rooms are set of the smallest (by area) possible cycles in this graph.
	 * @param corners The corners of the floorplan.
	 * @returns The rooms, each room as an array of corners.
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
					// give an exception if its the first corner and we aren't at the second corner
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
		// TODO: optimize this, only check corners with > 2 adjacents, or isolated cycles
		var loops = [];

		corners.forEach((firstCorner) => {
			firstCorner.adjacentCorners().forEach((secondCorner) => {
				loops.push(_findTightestCycle(firstCorner, secondCorner));
			});
		});

		// remove duplicates
		var uniqueLoops = _removeDuplicateRooms(loops);
		//remove CW loops
		var uniqueCCWLoops = Utils.removeIf(uniqueLoops, Utils.isClockwise);
		return uniqueCCWLoops;
	}
}
