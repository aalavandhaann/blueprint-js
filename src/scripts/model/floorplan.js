import { EVENT_UPDATED, EVENT_LOADED, EVENT_NEW, EVENT_DELETED, EVENT_ROOM_NAME_CHANGED, EVENT_NEW_ROOMS_ADDED } from '../core/events.js';
import { EVENT_CORNER_ATTRIBUTES_CHANGED, EVENT_WALL_ATTRIBUTES_CHANGED, EVENT_ROOM_ATTRIBUTES_CHANGED, EVENT_MOVED } from '../core/events.js';
import { EventDispatcher, Vector2, Vector3, Matrix4 } from 'three';
import { Utils } from '../core/utils.js';
import { Dimensioning } from '../core/dimensioning.js';
import { dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter } from '../core/constants.js';
import { WallTypes } from '../core/constants.js';
import { Version } from '../core/version.js';
import { cornerTolerance } from '../core/configuration.js';
import { Configuration, configDimUnit } from '../core/configuration.js';


import { HalfEdge } from './half_edge.js';
import { Corner } from './corner.js';
import { Wall } from './wall.js';
import { Room } from './room.js';

/** */
export const defaultFloorPlanTolerance = 10.0;

/**
 * A Floorplan represents a number of Walls, Corners and Rooms. This is an
 * abstract that keeps the 2d and 3d in sync
 */
export class Floorplan extends EventDispatcher {
    /** Constructs a floorplan. */
    constructor() {
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
    set carbonSheet(val) {
        this._carbonSheet = val;
    }

    /**
     * @return {CarbonSheet} _carbonSheet reference to the instance of
     *         {@link CarbonSheet}
     */
    get carbonSheet() {
        return this._carbonSheet;
    }

    /**
     * @return {HalfEdge[]} edges The array of {@link HalfEdge}
     */
    wallEdges() {
        let edges = [];
        this.walls.forEach((wall) => {
            if (wall.frontEdge) {
                edges.push(wall.frontEdge);
            }
            if (wall.backEdge) {
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
    roofPlanes() {
        let planes = [];
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
    wallEdgePlanes() {
        let planes = [];
        this.walls.forEach((wall) => {
            if (wall.frontEdge) {
                planes.push(wall.frontEdge.plane);
            }
            if (wall.backEdge) {
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
    floorPlanes() {
        return Utils.map(this.rooms, (room) => {
            return room.floorPlane;
        });
    }

    fireOnNewWall(callback) {
        this.new_wall_callbacks.add(callback);
    }

    fireOnNewCorner(callback) {
        this.new_corner_callbacks.add(callback);
    }

    fireOnRedraw(callback) {
        this.redraw_callbacks.add(callback);
    }

    fireOnUpdatedRooms(callback) {
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

    newWallsForIntersections(start, end) {
        let intersections = false;
        // This is a bug in the logic
        // When creating a new wall with a start and end
        // it needs to be checked if it is cutting other walls
        // If it cuts then all those walls have to removed and introduced as
        // new walls along with this new wall
        let cStart = new Vector2(start.getX(), start.getY());
        let cEnd = new Vector2(end.getX(), end.getY());
        let line = { p1: cStart, p2: cEnd };
        let newCorners = [];

        for (let i = 0; i < this.walls.length; i++) {
            let twall = this.walls[i];
            let bstart = { x: twall.getStartX(), y: twall.getStartY() };
            let bend = { x: twall.getEndX(), y: twall.getEndY() };
            let iPoint;
            if (twall.wallType === WallTypes.CURVED) {
                iPoint = twall.bezier.intersects(line);
                if (iPoint.length) {
                    iPoint = twall.bezier.get(iPoint[0]);
                }
            } else {
                iPoint = Utils.lineLineIntersectPoint(cStart, cEnd, bstart, bend);
            }
            if (iPoint) {
                let nCorner = this.newCorner(iPoint.x, iPoint.y);
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
    newWall(start, end, a, b) {
        let scope = this;
        let wall = new Wall(start, end, a, b);
        this.walls.push(wall);
        wall.addEventListener(EVENT_DELETED, function(o) { scope.removeWall(o.item); });
        wall.addEventListener(EVENT_WALL_ATTRIBUTES_CHANGED, function(o) {
            scope.dispatchEvent(o);
        });

        this.dispatchEvent({ type: EVENT_NEW, item: this, newItem: wall });
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
    newCorner(x, y, id) {
        let scope = this;
        let corner = new Corner(this, x, y, id);

        for (let i = 0; i < this.corners.length; i++) {
            let existingCorner = this.corners[i];
            if (existingCorner.distanceFromCorner(corner) < cornerTolerance) {
                return existingCorner;
            }
        }

        this.corners.push(corner);
        corner.addEventListener(EVENT_DELETED, function(o) {
            scope.removeCorner(o.item);
            scope.update();
            scope.dispatchEvent({ type: EVENT_DELETED, item: scope });
        });
        corner.addEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, function(o) {
            scope.dispatchEvent(o);
            let updatecorners = o.item.adjacentCorners();
            updatecorners.push(o.item);
            scope.update(false, updatecorners);
            //			scope.update(false);//For debug reasons
        });
        corner.addEventListener(EVENT_MOVED, function(o) {
            scope.dispatchEvent(o);
            let updatecorners = o.item.adjacentCorners();
            updatecorners.push(o.item);
            scope.update(false, updatecorners);
            //			scope.update(false);//For debug reasons
        });

        this.dispatchEvent({ type: EVENT_NEW, item: this, newItem: corner });

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
    removeWall(wall) {
        this.dispatchEvent({ type: EVENT_DELETED, item: this, deleted: wall, item_type: 'wall' });
        Utils.removeValue(this.walls, wall);
        this.update();
    }

    /**
     * Removes a corner.
     * 
     * @param {Corner}
     *            corner The corner to be removed.
     */
    removeCorner(corner) {
        this.dispatchEvent({ type: EVENT_DELETED, item: this, deleted: corner, item_type: 'corner' });
        Utils.removeValue(this.corners, corner);
    }

    /**
     * Gets the walls.
     * 
     * @return {Wall[]}
     */
    getWalls() {
        return this.walls;
    }

    /**
     * Gets the corners.
     * 
     * @return {Corner[]}
     */
    getCorners() {
        return this.corners;
    }

    /**
     * Gets the rooms.
     * 
     * @return {Room[]}
     */
    getRooms() {
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
    overlappedRoom(mx, my) {
        for (let i = 0; i < this.rooms.length; i++) {
            let room = this.rooms[i];
            let flag = room.pointInRoom(new Vector2(mx, my));
            if (flag) {
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
    overlappedControlPoint(wall, x, y, tolerance) {
        tolerance = tolerance || defaultFloorPlanTolerance * 5;
        if (wall.a.distanceTo(new Vector2(x, y)) < tolerance && wall.wallType === WallTypes.CURVED) {
            return wall.a;
        } else if (wall.b.distanceTo(new Vector2(x, y)) < tolerance && wall.wallType === WallTypes.CURVED) {
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
    overlappedCorner(x, y, tolerance) {
        tolerance = tolerance || defaultFloorPlanTolerance;
        for (let i = 0; i < this.corners.length; i++) {
            if (this.corners[i].distanceFrom(new Vector2(x, y)) < tolerance) {
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
    overlappedWall(x, y, tolerance) {
        tolerance = tolerance || defaultFloorPlanTolerance;
        for (let i = 0; i < this.walls.length; i++) {
            let newtolerance = tolerance; // (tolerance+
            // ((this.walls[i].wallType ==
            // WallTypes.CURVED)*tolerance*10));
            if (this.walls[i].distanceFrom(new Vector2(x, y)) < newtolerance) {
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
    getMetaRoomData() {
        let metaRoomData = {};
        this.rooms.forEach((room) => {
            let metaroom = {};
            // var cornerids = [];
            // room.corners.forEach((corner)=>{
            // cornerids.push(corner.id);
            // });
            // var ids = cornerids.join(',');
            let ids = room.roomByCornersId;
            metaroom['name'] = room.name;
            metaRoomData[ids] = metaroom;
        });
        return metaRoomData;
    }

    // Save the floorplan as a json object file
    /**
     * @return {void}
     */
    saveFloorplan() {
        let floorplans = { version: Version.getTechnicalVersion(), corners: {}, walls: [], rooms: {}, wallTextures: [], floorTextures: {}, newFloorTextures: {}, carbonSheet: {} };
        let cornerIds = [];
        // writing all the corners based on the corners array
        // is having a bug. This is because some walls have corners
        // that aren't part of the corners array anymore. This is a quick fix
        // by adding the corners to the json file based on the corners in the walls
        // this.corners.forEach((corner) => {
        // floorplans.corners[corner.id] = {'x': corner.x,'y': corner.y};
        // });

        this.walls.forEach((wall) => {
            if (wall.getStart() && wall.getEnd()) {
                floorplans.walls.push({
                    'corner1': wall.getStart().id,
                    'corner2': wall.getEnd().id,
                    'frontTexture': wall.frontTexture,
                    'backTexture': wall.backTexture,
                    'wallType': wall.wallType.description,
                    'a': { x: wall.a.x, y: wall.a.y },
                    'b': { x: wall.b.x, y: wall.b.y },
                });
                cornerIds.push(wall.getStart());
                cornerIds.push(wall.getEnd());
            }
        });

        cornerIds.forEach((corner) => {
            floorplans.corners[corner.id] = { 'x': Dimensioning.cmToMeasureRaw(corner.x), 'y': Dimensioning.cmToMeasureRaw(corner.y), 'elevation': Dimensioning.cmToMeasureRaw(corner.elevation) };
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

        if (this.carbonSheet) {
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
    loadFloorplan(floorplan) {
        this.reset();
        let corners = {};
        if (floorplan == null || !('corners' in floorplan) || !('walls' in floorplan)) {
            return;
        }
        let currentUnit = Configuration.getStringValue(configDimUnit);
        if (floorplan.units) {
            switch (floorplan.units) {
                case dimInch:
                    Configuration.setValue(configDimUnit, dimInch);
                    break;
                case dimFeetAndInch:
                    Configuration.setValue(configDimUnit, dimFeetAndInch);
                    break;
                case dimMeter:
                    Configuration.setValue(configDimUnit, dimMeter);
                    break;
                case dimCentiMeter:
                    Configuration.setValue(configDimUnit, dimCentiMeter);
                    break;
                case dimMilliMeter:
                default:
                    Configuration.setValue(configDimUnit, dimMilliMeter);
                    break;
            }

        }

        for (let id in floorplan.corners) {
            let corner = floorplan.corners[id];
            corners[id] = this.newCorner(Dimensioning.cmFromMeasureRaw(corner.x), Dimensioning.cmFromMeasureRaw(corner.y), id);
            if (corner.elevation) {
                corners[id].elevation = Dimensioning.cmFromMeasureRaw(corner.elevation);
            }
        }
        let scope = this;
        floorplan.walls.forEach((wall) => {
            let newWall = scope.newWall(corners[wall.corner1], corners[wall.corner2]);

            if (wall.frontTexture) {
                newWall.frontTexture = wall.frontTexture;
            }
            if (wall.backTexture) {
                newWall.backTexture = wall.backTexture;
            }
            // Adding of a, b, wallType (straight, curved) for walls happened
            // with introduction of 0.0.2a
            if (Version.isVersionHigherThan(floorplan.version, '0.0.2a')) {
                newWall.a = wall.a;
                newWall.b = wall.b;
                if (wall.wallType === 'CURVED') {
                    newWall.wallType = WallTypes.CURVED;
                } else {
                    newWall.wallType = WallTypes.STRAIGHT;
                }
            }
        });

        if ('newFloorTextures' in floorplan) {
            this.floorTextures = floorplan.newFloorTextures;
        }
        this.metaroomsdata = floorplan.rooms;
        this.update();
        this.dispatchEvent({ type: EVENT_LOADED, item: this });
        Configuration.setValue(configDimUnit, currentUnit);
        // this.roomLoadedCallbacks.fire();
    }

    /**
     * @deprecated
     */
    getFloorTexture(uuid) {
        if (uuid in this.floorTextures) {
            return this.floorTextures[uuid];
        }
        return null;
    }

    /**
     * @deprecated
     */
    setFloorTexture(uuid, url, scale) {
        this.floorTextures[uuid] = { url: url, scale: scale };
    }

    /** clear out obsolete floor textures */
    /**
     * @deprecated
     */
    updateFloorTextures() {
        let uuids = Utils.map(this.rooms, function(room) { return room.getUuid(); });
        for (let uuid in this.floorTextures) {
            if (!Utils.hasValue(uuids, uuid)) {
                delete this.floorTextures[uuid];
            }
        }
    }

    /**
     * Resets the floorplan data to empty
     * 
     * @return {void}
     */
    reset() {
        let tmpCorners = this.corners.slice(0);
        let tmpWalls = this.walls.slice(0);

        tmpWalls.forEach((wall) => {
            wall.remove();
            wall = null;
        });

        tmpCorners.forEach((corner) => {
            corner.remove();
            corner = null;
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
    roomNameChanged(e) {
        if (this.metaroomsdata) {
            this.metaroomsdata[e.item.roomByCornersId] = e.newname;
        }
    }

    /**
     * Update the floorplan with new rooms, remove old rooms etc.
     */
    update(updateroomconfiguration = true, updatecorners = null) //Should include for , updatewalls=null, updaterooms=null
        {
            if (updatecorners != null) {
                //			console.log('UPDATE CORNER ANGLES ::: ', updatecorners.length);
                updatecorners.forEach((corner) => {
                    corner.updateAngles();
                })
            }

            if (!updateroomconfiguration) {
                this.dispatchEvent({ type: EVENT_UPDATED, item: this });
                return;
            }

            //		console.log('UPDATE ROOM WITH NEW ENTRIES ::: ');

            let scope = this;
            this.walls.forEach((wall) => {
                wall.resetFrontBack();
            });

            // this.rooms.forEach((room)=>{room.removeEventListener(EVENT_ROOM_NAME_CHANGED,
            // scope.roomNameChanged)});

            let roomCorners = this.findRooms(this.corners);
            this.rooms = [];


            this.corners.forEach((corner) => {
                corner.clearAttachedRooms();
                //			corner.updateAngles();
            });

            roomCorners.forEach((corners) => {
                let room = new Room(scope, corners);
                room.updateArea();
                scope.rooms.push(room);

                room.addEventListener(EVENT_ROOM_NAME_CHANGED, (e) => { scope.roomNameChanged(e); });
                room.addEventListener(EVENT_ROOM_ATTRIBUTES_CHANGED, function(o) {
                    let room = o.item;
                    scope.dispatchEvent(o);
                    if (scope.metaroomsdata[room.roomByCornersId]) {
                        scope.metaroomsdata[room.roomByCornersId]['name'] = room.name;
                    } else {
                        scope.metaroomsdata[room.roomByCornersId] = {};
                        scope.metaroomsdata[room.roomByCornersId]['name'] = room.name;
                    }
                });

                if (scope.metaroomsdata) {
                    if (scope.metaroomsdata[room.roomByCornersId]) {
                        room.name = scope.metaroomsdata[room.roomByCornersId]['name'];
                    }
                }
            });
            this.assignOrphanEdges();
            this.updateFloorTextures();
            this.dispatchEvent({ type: EVENT_UPDATED, item: this });
            this.dispatchEvent({ type: EVENT_NEW_ROOMS_ADDED, item: this });

            // console.log('TOTAL WALLS ::: ', this.walls.length);
        }

    /**
     * Returns the center of the floorplan in the y plane
     * 
     * @return {Vector2} center
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    getCenter() {
        return this.getDimensions(true);
    }

    /**
     * Returns the bounding volume of the full floorplan
     * 
     * @return {Vector3} size
     * @see https://threejs.org/docs/#api/en/math/Vector3
     */
    getSize() {
        return this.getDimensions(false);
    }

    getSize3() {
        let size2D = this.getDimensions();
        let size3D = new Vector3(size2D.x, size2D.z, Number.MIN_VALUE);
        for (let i = 0; i < this.corners.length; i++) {
            let corner = this.corners[i];
            size3D.z = Math.max(size3D.z, corner.elevation);
        }
        return size3D;
    }

    setSize(newSize) {
        let i = 0;
        let m = new Matrix4();
        let currentSize = this.getSize3();
        let scale = newSize.clone().divide(currentSize);
        m.scale(scale);
        for (; i < this.corners.length; i++) {
            let corner = this.corners[i];
            let vector = new Vector3(corner.location.x, corner.location.y, corner.elevation);
            vector = vector.applyMatrix4(m);
            corner.elevation = vector.z;
            corner.move(vector.x, vector.y);
        }
    }

    /**
     * Returns the bounding size or the center location of the full floorplan
     * 
     * @param {boolean}
     *            center If true return the center else the size
     * @return {Vector3} size
     * @see https://threejs.org/docs/#api/en/math/Vector3
     */
    getDimensions(center) {
        center = center || false; // otherwise, get size

        let xMin = Infinity;
        let xMax = -Infinity;
        let zMin = Infinity;
        let zMax = -Infinity;
        this.corners.forEach((corner) => {
            if (corner.x < xMin) xMin = corner.x;
            if (corner.x > xMax) xMax = corner.x;
            if (corner.y < zMin) zMin = corner.y;
            if (corner.y > zMax) zMax = corner.y;
        });
        let ret;
        if (xMin === Infinity || xMax === -Infinity || zMin === Infinity || zMax === -Infinity) {
            ret = new Vector3();
        } else {
            if (center) {
                // center
                ret = new Vector3((xMin + xMax) * 0.5, 0, (zMin + zMax) * 0.5);
            } else {
                // size
                ret = new Vector3((xMax - xMin), 0, (zMax - zMin));
            }
        }
        return ret;
    }

    /**
     * An internal cleanup method
     */
    assignOrphanEdges() {
        // kinda hacky
        // find orphaned wall segments (i.e. not part of rooms) and
        // give them edges
        let orphanWalls = [];
        this.walls.forEach((wall) => {
            if (!wall.backEdge && !wall.frontEdge) {
                wall.orphan = true;
                let back = new HalfEdge(null, wall, false);
                let front = new HalfEdge(null, wall, true);
                back.generatePlane();
                front.generatePlane();
                orphanWalls.push(wall);
            }
        });
    }

    /**
     * Find the 'rooms' in our planar straight-line graph. Rooms are set of the
     * smallest (by area) possible cycles in this graph.
     * 
     * @param corners
     *            The corners of the floorplan.
     * @returns The rooms, each room as an array of corners.
     * @param {Corners[]}
     *            corners
     * @return {Corners[][]} loops
     */
    findRooms(corners) {

        function _calculateTheta(previousCorner, currentCorner, nextCorner) {
            let theta = Utils.angle2pi(new Vector2(previousCorner.x - currentCorner.x, previousCorner.y - currentCorner.y), new Vector2(nextCorner.x - currentCorner.x, nextCorner.y - currentCorner.y));
            return theta;
        }

        function _removeDuplicateRooms(roomArray) {
            let results = [];
            let lookup = {};
            let hashFunc = function(corner) {
                return corner.id;
            };
            let sep = '-';
            for (let i = 0; i < roomArray.length; i++) {
                // rooms are cycles, shift it around to check uniqueness
                let add = true;
                let room = roomArray[i];
                let str;
                for (let j = 0; j < room.length; j++) {
                    let roomShift = Utils.cycle(room, j);
                    str = Utils.map(roomShift, hashFunc).join(sep);
                    if (lookup.hasOwnProperty(str)) {
                        add = false;
                    }
                }
                if (add) {
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
        function _findTightestCycle(firstCorner, secondCorner) {
            let stack = [];
            let next = { corner: secondCorner, previousCorners: [firstCorner] };
            let visited = {};
            visited[firstCorner.id] = true;

            while (next) {
                // update previous corners, current corner, and visited corners
                let currentCorner = next.corner;
                visited[currentCorner.id] = true;

                // did we make it back to the startCorner?
                if (next.corner === firstCorner && currentCorner !== secondCorner) {
                    return next.previousCorners;
                }

                let addToStack = [];
                let adjacentCorners = next.corner.adjacentCorners();
                for (let i = 0; i < adjacentCorners.length; i++) {
                    let nextCorner = adjacentCorners[i];

                    // is this where we came from?
                    // give an exception if its the first corner and we aren't
                    // at the second corner
                    if (nextCorner.id in visited && !(nextCorner === firstCorner && currentCorner !== secondCorner)) {
                        continue;
                    }

                    // nope, throw it on the queue
                    addToStack.push(nextCorner);
                }

                let previousCorners = next.previousCorners.slice(0);
                previousCorners.push(currentCorner);
                if (addToStack.length > 1) {
                    // visit the ones with smallest theta first
                    let previousCorner = next.previousCorners[next.previousCorners.length - 1];
                    addToStack.sort(function(a, b) { return (_calculateTheta(previousCorner, currentCorner, b) - _calculateTheta(previousCorner, currentCorner, a)); });
                }

                if (addToStack.length > 0) {
                    // add to the stack
                    addToStack.forEach((corner) => {
                        stack.push({ corner: corner, previousCorners: previousCorners });
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
        let loops = [];

        corners.forEach((firstCorner) => {
            firstCorner.adjacentCorners().forEach((secondCorner) => {
                loops.push(_findTightestCycle(firstCorner, secondCorner));
            });
        });

        // remove duplicates
        let uniqueLoops = _removeDuplicateRooms(loops);
        // remove CW loops
        let uniqueCCWLoops = Utils.removeIf(uniqueLoops, Utils.isClockwise);
        return uniqueCCWLoops;
    }
}
export default Floorplan;