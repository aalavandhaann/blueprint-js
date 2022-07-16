import { EVENT_UPDATED, EVENT_LOADED, EVENT_NEW, EVENT_DELETED, EVENT_ROOM_NAME_CHANGED, EVENT_MODE_RESET, EVENT_EXTERNAL_FLOORPLAN_LOADED } from '../core/events.js';
import { EVENT_CORNER_ATTRIBUTES_CHANGED, EVENT_WALL_ATTRIBUTES_CHANGED, EVENT_ROOM_ATTRIBUTES_CHANGED, EVENT_MOVED, EVENT_NEW_ROOMS_ADDED } from '../core/events.js';
import { EventDispatcher, Vector2, Vector3, Matrix4 } from 'three';
import { Utils } from '../core/utils.js';
import { Dimensioning } from '../core/dimensioning.js';
import { dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter, defaultWallTexture, defaultFloorTexture } from '../core/constants.js';
import { WallTypes } from '../core/constants.js';
import { Version } from '../core/version.js';
import { cornerTolerance, Configuration, configDimUnit } from '../core/configuration.js';


import { HalfEdge } from './half_edge.js';
import { Corner } from './corner.js';
import { Wall } from './wall.js';
import { Room } from './room.js';
import { CornerGroups } from './cornergroups.js';
import Boundary from './boundary.js';

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


        this.__boundary = new Boundary(this);

        this.__externalCorners = [];
        this.__externalWalls = [];
        this.__externalRooms = [];

        this.__roofPlanesForIntersection = [];
        this.__floorPlanesForIntersection = [];
        this.__wallPlanesForIntersection = [];

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

        /**
         * This is necessary to sometimes explicitly stop the floorplan from doing
         * heavy computations
         */
        this.__updatesOn = true;

        this.__cornerGroups = new CornerGroups(this);

        this.__wallAttributesChangedEvent = this.__wallAttributesChanged.bind(this);
        this.__wallDeletedEvent = this.__wallDeleted.bind(this);
        this.__cornerAttributesChangedOrMovedEvent = this.__cornerAttributesChangedOrMoved.bind(this);
        this.__cornerDeletedEvent = this.__cornerDeleted.bind(this);

    }

    externalWallEdges() {
            let edges = [];
            this.__externalWalls.forEach((wall) => {
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
         * @return {HalfEdge[]} edges The array of {@link HalfEdge}
         */
    wallEdges() {
        var edges = [];
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

    __wallDeleted(evt) {
        let wall = evt.item;
        wall.removeEventListener(EVENT_DELETED, this.__wallDeletedEvent);
        wall.removeEventListener(EVENT_WALL_ATTRIBUTES_CHANGED, this.__wallAttributesChangedEvent);
        this.removeWall(wall);
    }

    __wallAttributesChanged(evt) {
        this.dispatchEvent(evt);
    }

    __cornerDeleted(evt) {
        let corner = evt.item;

        corner.removeEventListener(EVENT_DELETED, this.__cornerDeletedEvent);
        corner.removeEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, this.__cornerAttributesChangedOrMovedEvent);
        corner.removeEventListener(EVENT_MOVED, this.__cornerAttributesChangedOrMovedEvent);

        this.removeCorner(corner);
        this.update();
        this.dispatchEvent({ type: EVENT_DELETED, item: this });
    }

    __cornerAttributesChangedOrMoved(evt) {
        this.dispatchEvent(evt);
        let updateCorners = evt.item.adjacentCorners();
        updateCorners.push(evt.item);
        this.update(false, updateCorners);
    }

    /**
     * Returns the roof planes in the floorplan for intersection testing
     * 
     * @return {Mesh[]} planes
     * @see <https://threejs.org/docs/#api/en/objects/Mesh>
     */
    createRoofPlanes() {
        var planes = [];
        this.rooms.forEach((room) => {
            planes.push(room.roofPlane);
        });
        return planes;
    }

    /**
     * Returns all the planes for intersection of the floors in all room
     * 
     * @return {Mesh[]} planes
     * @see <https://threejs.org/docs/#api/en/objects/Mesh>
     */
    createFloorPlanes() {
        return Utils.map(this.rooms, (room) => {
            return room.floorPlane;
        });
    }

    /**
     * Returns all the planes for intersection for the walls
     * 
     * @return {Mesh[]} planes
     * @see <https://threejs.org/docs/#api/en/objects/Mesh>
     */
    createWallEdgePlanes() {
        var planes = [];
        this.walls.forEach((wall) => {
            if (wall.frontEdge) {
                planes.push(wall.frontEdge.plane);
                if(wall.frontEdge.exteriorPlane){
                    planes.push(wall.frontEdge.exteriorPlane);
                }
            }
            if (wall.backEdge) {
                planes.push(wall.backEdge.plane);
                if(wall.backEdge.exteriorPlane){
                    planes.push(wall.backEdge.exteriorPlane);
                }
            }
        });
        return planes;
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
        var intersections = false;
        // This is a bug in the logic
        // When creating a new wall with a start and end
        // it needs to be checked if it is cutting other walls
        // If it cuts then all those walls have to removed and introduced as
        // new walls along with this new wall
        var cStart = new Vector2(start.getX(), start.getY());
        var cEnd = new Vector2(end.getX(), end.getY());
        var line = { p1: cStart, p2: cEnd };
        var newCorners = [];

        for (var i = 0; i < this.walls.length; i++) {
            var twall = this.walls[i];
            var bstart = { x: twall.getStartX(), y: twall.getStartY() };
            var bend = { x: twall.getEndX(), y: twall.getEndY() };
            var iPoint;
            if (twall.wallType === WallTypes.CURVED) {
                iPoint = twall.bezier.intersects(line);
                if (iPoint.length) {
                    iPoint = twall.bezier.get(iPoint[0]);
                }
            } else {
                iPoint = Utils.lineLineIntersectPoint(cStart, cEnd, bstart, bend);
            }
            if (iPoint) {
                var nCorner = this.newCorner(iPoint.x, iPoint.y);
                newCorners.push(nCorner);
                nCorner.mergeWithIntersected(false);
                intersections = true;
            }
        }
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
        var scope = this;
        var wall = new Wall(start, end, a, b);

        this.walls.push(wall);
        // wall.addEventListener(EVENT_DELETED, function(o) { scope.removeWall(o.item); });
        // wall.addEventListener(EVENT_WALL_ATTRIBUTES_CHANGED, function(o) {
        //     scope.dispatchEvent(o);
        // });

        wall.addEventListener(EVENT_DELETED, this.__wallDeletedEvent);
        wall.addEventListener(EVENT_WALL_ATTRIBUTES_CHANGED, this.__wallAttributesChangedEvent);

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
        var scope = this;
        var corner = new Corner(this, x, y, id);

        for (var i = 0; i < this.corners.length; i++) {
            var existingCorner = this.corners[i];
            if (existingCorner.distanceFromCorner(corner) < cornerTolerance) {
                this.dispatchEvent({ type: EVENT_NEW, item: this, newItem: existingCorner });
                return existingCorner;
            }
        }

        this.corners.push(corner);

        corner.addEventListener(EVENT_DELETED, this.__cornerDeletedEvent);
        corner.addEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, this.__cornerAttributesChangedOrMovedEvent);
        corner.addEventListener(EVENT_MOVED, this.__cornerAttributesChangedOrMovedEvent);
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
        Utils.removeValue(this.walls, wall);
        this.update();
        this.dispatchEvent({ type: EVENT_DELETED, item: this, deleted: wall, item_type: 'wall' });
    }

    /**
     * Removes a corner.
     * 
     * @param {Corner}
     *            corner The corner to be removed.
     */
    removeCorner(corner) {
        Utils.removeValue(this.corners, corner);
        this.update();
        this.dispatchEvent({ type: EVENT_DELETED, item: this, deleted: corner, item_type: 'corner' });
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
        for (var i = 0; i < this.rooms.length; i++) {
            var room = this.rooms[i];
            var flag = room.pointInRoom(new Vector2(mx, my));
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
        for (var i = 0; i < this.corners.length; i++) {
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
        for (var i = 0; i < this.walls.length; i++) {
            var newtolerance = tolerance; // (tolerance+
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
        var metaRoomData = {};
        this.rooms.forEach((room) => {
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
    saveFloorplan() {
        var floorplans = { version: Version.getTechnicalVersion(), corners: {}, walls: [], rooms: {}, wallTextures: [], floorTextures: {}, newFloorTextures: {}, carbonSheet: {} };
        var cornerIds = [];
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
                    'thickness': Dimensioning.cmToMeasureRaw(wall.thickness),
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

        if(this.__boundary){
            if(this.__boundary.isValid){
                let boundaryData = {};
                let measurePoints = [];
                for (let i =0;i < this.__boundary.points.length;i++){
                    let cmPoint = this.__boundary.points[i];
                    let measurePoint = {
                        x: Dimensioning.cmToMeasureRaw(cmPoint.x), 
                        y: Dimensioning.cmToMeasureRaw(cmPoint.y),
                        elevation: Dimensioning.cmToMeasureRaw(cmPoint.elevation),
                    };
                    measurePoints.push(measurePoint);
                }

                boundaryData.points = measurePoints;
                boundaryData.style = this.__boundary.style;
                floorplans.boundary = boundaryData;
            }
        }

        floorplans.units = Configuration.getStringValue(configDimUnit);

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
        this.__updatesOn = false;
        let corners = {};
        if (floorplan === null || !('corners' in floorplan) || !('walls' in floorplan)) {
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
                if (wall.frontTexture.colormap) {
                    newWall.frontTexture = wall.frontTexture;
                } else {
                    newWall.frontTexture = defaultWallTexture;
                }

            }
            if (wall.backTexture) {
                if (wall.backTexture.colormap) {
                    newWall.backTexture = wall.backTexture;
                } else {
                    newWall.backTexture = defaultWallTexture;
                }

            }
            if (wall.thickness) {
                newWall.thickness = Dimensioning.cmFromMeasureRaw(wall.thickness);
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

        if('boundary' in floorplan){
            if(floorplan.boundary.points){
                let cmPoints = [];
                for (let i =0;i < floorplan.boundary.points.length;i++){
                    let point = floorplan.boundary.points[i];
                    let cmPoint = {
                        x: Dimensioning.cmFromMeasureRaw(point.x), 
                        y: Dimensioning.cmFromMeasureRaw(point.y),
                        elevation: Dimensioning.cmFromMeasureRaw(point.elevation),
                    };
                    cmPoints.push(cmPoint);
                }

                floorplan.boundary.points = cmPoints;
                this.__boundary.addBoundaryRegion(cmPoints);
                this.__boundary.metadata = floorplan.boundary;
            }
        }

        this.__updatesOn = true;
        this.metaroomsdata = floorplan.rooms;
        this.update();
        Configuration.setValue(configDimUnit, currentUnit);
        this.dispatchEvent({ type: EVENT_LOADED, item: this });
        // this.roomLoadedCallbacks.fire();
    }

    // Load the floorplan from a previously saved json object file
    /**
     * @param {JSON}
     *            floorplan
     * @return {void}
     * @emits {EVENT_LOADED}
     */
    loadLockedFloorplan(floorplan) {
        if (floorplan === null || !('corners' in floorplan) || !('walls' in floorplan)) {
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
                    Configuration.setValue(configDimUnit, dimMilliMeter);
                    break;
            }
        }


        let externalNewCorners = {};

        for (let id in floorplan.corners) {
            let cornerData = floorplan.corners[id];
            let corner = new Corner(this, Dimensioning.cmFromMeasureRaw(cornerData.x), Dimensioning.cmFromMeasureRaw(cornerData.y));
            corner.elevation = Dimensioning.cmFromMeasureRaw(cornerData.elevation);
            corner.isLocked = true;
            externalNewCorners[id] = corner;
            this.__externalCorners.push(corner);
        }
        floorplan.walls.forEach((wall) => {
            let corner1 = externalNewCorners[wall.corner1];
            let corner2 = externalNewCorners[wall.corner2];
            let newWall = new Wall(corner1, corner2);
            newWall.isLocked = true;
            if (wall.frontTexture) {
                if (wall.frontTexture.colormap) {
                    newWall.frontTexture = wall.frontTexture;
                } else {
                    newWall.frontTexture = defaultWallTexture;
                }

            }
            if (wall.backTexture) {
                if (wall.backTexture.colormap) {
                    newWall.backTexture = wall.backTexture;
                } else {
                    newWall.backTexture = defaultWallTexture;
                }

            }
            if (wall.thickness) {
                newWall.thickness = Dimensioning.cmFromMeasureRaw(wall.thickness);
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
            this.__externalWalls.push(newWall);
        });



        for (let roomKey in floorplan.rooms) {
            let cornerIds = roomKey.split(',');
            let roomCorners = [];
            let isValidRoom = true;
            for (let j = 0; j < cornerIds.length; j++) {
                let cornerId = cornerIds[j];
                if (!externalNewCorners[cornerId]) {
                    isValidRoom = false;
                    break;
                }
                roomCorners.push(externalNewCorners[cornerId]);
            }
            if (isValidRoom) {
                let newRoom = new Room(this, roomCorners);
                newRoom.updateArea();
                newRoom.isLocked = true;
                this.__externalRooms.push(newRoom);
            }
        }

        // if('boundary' in floorplan){
        //     if(floorplan.boundary.points){
        //         let cmPoints = [];
        //         for (let i =0;i < floorplan.boundary.points.length;i++){
        //             let point = floorplan.boundary.points[i];
        //             let cmPoint = {
        //                 x: Dimensioning.cmFromMeasureRaw(point.x), 
        //                 y: Dimensioning.cmFromMeasureRaw(point.y),
        //                 elevation: Dimensioning.cmFromMeasureRaw(point.elevation),
        //             };
        //             cmPoints.push(cmPoint);
        //         }

        //         floorplan.boundary.points = cmPoints;
        //         this.__boundary = new Boundary(this, floorplan.boundary);
        //     }
        // }

        Configuration.setValue(configDimUnit, currentUnit);
        this.dispatchEvent({ type: EVENT_EXTERNAL_FLOORPLAN_LOADED, item: this });
        // this.roomLoadedCallbacks.fire();
    }

    /**
     * @deprecated
     */
    getFloorTexture(uuid) {
        if (uuid in this.floorTextures) {
            let floorTexture = this.floorTextures[uuid];
            if (floorTexture.colormap) {
                return floorTexture;
            }

        }
        return null;
    }

    /**
     * @deprecated
     */
    setFloorTexture(uuid, texturePack) {
        this.floorTextures[uuid] = texturePack;
    }

    /** clear out obsolete floor textures */
    /**
     * @deprecated
     */
    updateFloorTextures() {
        var uuids = Utils.map(this.rooms, function(room) { return room.getUuid(); });
        for (var uuid in this.floorTextures) {
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
        this.rooms = [];
        this.metaroomsdata = {};
        this.__externalRooms = [];
        this.__externalCorners = [];
        this.__externalWalls = [];
        this.dispatchEvent({ type: EVENT_MODE_RESET });
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
        let size3D = new Vector3(size2D.x, size2D.z, -Number.MAX_VALUE);
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
        let infinity = 1.0e10;
        let xMin = infinity;
        let xMax = -infinity;
        let zMin = infinity;
        let zMax = -infinity;
        this.corners.forEach((corner) => {
            xMin = Math.min(xMin, corner.x);
            xMax = Math.max(xMax, corner.x);
            zMin = Math.min(zMin, corner.y);
            zMax = Math.max(zMax, corner.y);
            // if (corner.x < xMin) xMin = corner.x;
            // if (corner.x > xMax) xMax = corner.x;
            // if (corner.y < zMin) zMin = corner.y;
            // if (corner.y > zMax) zMax = corner.y;
        });
        // console.log(xMin, xMax, zMin, zMax);        
        let ret;
        if (xMin === infinity || xMax === -infinity || zMin === infinity || zMax === -infinity) {
            ret = new Vector3();
        } else {
            if (center) {
                // center
                ret = new Vector3(xMin + ((xMax - xMin)* 0.5), 0, zMin + ((zMax - zMin) * 0.5));
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
            // if (!wall.backEdge) {
            //     let back = new HalfEdge(null, wall, false);
            //     back.generatePlane();
            // }
            // if (!wall.frontEdge) {
            //     let front = new HalfEdge(null, wall, true);
            //     front.generatePlane();
            // }
            if (!wall.backEdge && !wall.frontEdge) {
                let back = new HalfEdge(null, wall, false);
                let front = new HalfEdge(null, wall, true);
                wall.orphan = true;
                back.generatePlane();
                front.generatePlane();                
                orphanWalls.push(wall);
            }
        });
    }

    /**
     * Update the floorplan with new rooms, remove old rooms etc.
     * //Should include for , updatewalls=null, updaterooms=null
     */
    update(updateroomconfiguration = true, updatecorners = null) {
        if (!this.__updatesOn) {
            return;
        }
        if (updatecorners != null) {
            //			console.log('UPDATE CORNER ANGLES ::: ', updatecorners.length);
            updatecorners.forEach((corner) => {
                corner.updateAngles();
            });
        }
        if (!updateroomconfiguration) {
            this.dispatchEvent({ type: EVENT_UPDATED, item: this });
            return;
        }

        var scope = this;
        this.walls.forEach((wall) => {
            wall.resetFrontBack();
        });


        //Destroy current room objects
        this.rooms.forEach((room) => {
            room.destroy();
        });


        // this.rooms.forEach((room)=>{room.removeEventListener(EVENT_ROOM_NAME_CHANGED,
        // scope.roomNameChanged)});

        var roomCorners = this.findRooms(this.corners);
        this.rooms = [];


        this.corners.forEach((corner) => {
            corner.clearAttachedRooms();
            //			corner.updateAngles();
        });

        roomCorners.forEach((corners) => {
            var room = new Room(scope, corners);
            room.updateArea();
            scope.rooms.push(room);

            room.addEventListener(EVENT_ROOM_NAME_CHANGED, (e) => { scope.roomNameChanged(e); });
            room.addEventListener(EVENT_ROOM_ATTRIBUTES_CHANGED, function(o) {
                var room = o.item;
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
                } else {
                    scope.metaroomsdata[room.roomByCornersId] = {};
                    scope.metaroomsdata[room.roomByCornersId]['name'] = room.name;
                }
            }
        });

        this.assignOrphanEdges();

        this.__roofPlanesForIntersection.length = 0;
        this.__floorPlanesForIntersection.length = 0;
        this.__wallPlanesForIntersection.length = 0;

        this.__roofPlanesForIntersection.push.apply(this.__roofPlanesForIntersection, this.createRoofPlanes());
        this.__floorPlanesForIntersection.push.apply(this.__floorPlanesForIntersection, this.createFloorPlanes());
        this.__wallPlanesForIntersection.push.apply(this.__wallPlanesForIntersection, this.createWallEdgePlanes());

        this.__cornerGroups.createGroups();
        
        this.updateFloorTextures();

        this.dispatchEvent({ type: EVENT_UPDATED, item: this });
        this.dispatchEvent({ type: EVENT_NEW_ROOMS_ADDED, item: this });
    }

    /**
     * Find the "rooms" in our planar straight-line graph. Rooms are set of the
     * smallest (by area) possible cycles in this graph. The room corners are always
     * ordered in clockwise direction
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
            var theta = Utils.angle2pi(new Vector2(previousCorner.x - currentCorner.x, previousCorner.y - currentCorner.y), new Vector2(nextCorner.x - currentCorner.x, nextCorner.y - currentCorner.y));
            return theta;
        }

        function _removeDuplicateRooms(roomArray) {
            var results = [];
            var lookup = {};
            var hashFunc = function(corner) {
                return corner.id;
            };
            var sep = '-';
            for (var i = 0; i < roomArray.length; i++) {
                // rooms are cycles, shift it around to check uniqueness
                var add = true;
                var room = roomArray[i];
                for (var j = 0; j < room.length; j++) {
                    var roomShift = Utils.cycle(room, j);
                    var str = Utils.map(roomShift, hashFunc).join(sep);
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
            var stack = [];
            var next = { corner: secondCorner, previousCorners: [firstCorner] };
            var visited = {};
            visited[firstCorner.id] = true;

            while (next) {
                // update previous corners, current corner, and visited corners
                var currentCorner = next.corner;
                visited[currentCorner.id] = true;

                // did we make it back to the startCorner?
                if (next.corner === firstCorner && currentCorner !== secondCorner) {
                    return next.previousCorners;
                }

                var addToStack = [];
                var adjacentCorners = next.corner.adjacentCorners();
                for (var i = 0; i < adjacentCorners.length; i++) {
                    var nextCorner = adjacentCorners[i];

                    // is this where we came from?
                    // give an exception if its the first corner and we aren't
                    // at the second corner
                    if (nextCorner.id in visited && !(nextCorner === firstCorner && currentCorner !== secondCorner)) {
                        continue;
                    }

                    // nope, throw it on the queue
                    addToStack.push(nextCorner);
                }

                var previousCorners = next.previousCorners.slice(0);
                previousCorners.push(currentCorner);
                if (addToStack.length > 1) {
                    // visit the ones with smallest theta first
                    var previousCorner = next.previousCorners[next.previousCorners.length - 1];
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

    get roofPlanesForIntersection() {
        return this.__roofPlanesForIntersection;
    }

    get floorPlanesForIntersection() {
        return this.__floorPlanesForIntersection;
    }

    get wallPlanesForIntersection() {
        return this.__wallPlanesForIntersection;
    }

    get cornerGroups() {
        return this.__cornerGroups;
    }

    get externalCorners() {
        return this.__externalCorners;
    }

    get externalWalls() {
        return this.__externalWalls;
    }

    get externalRooms() {
        return this.__externalRooms;
    }

    get boundary(){
        return this.__boundary;
    }
}
export default Floorplan;