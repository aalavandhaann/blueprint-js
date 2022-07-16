import { EventDispatcher, Vector2, Vector3, Face3, Geometry, Shape, ShapeGeometry, Mesh, MeshBasicMaterial, DoubleSide, Box3 } from 'three';
import { Plane, Matrix4 } from 'three';
import { EVENT_CHANGED, EVENT_ROOM_ATTRIBUTES_CHANGED, EVENT_MOVED, EVENT_UPDATED, EVENT_UPDATE_TEXTURES, EVENT_CORNER_ATTRIBUTES_CHANGED, EVENT_MODIFY_TEXTURE_ATTRIBUTE } from '../core/events.js';
import { Region } from '../core/utils.js';
import { WallTypes, TEXTURE_DEFAULT_REPEAT, defaultFloorTexture } from '../core/constants.js';
import { Utils } from '../core/utils.js';
import { HalfEdge } from './half_edge.js';
import { BufferGeometry } from 'three/build/three.module';
/** Default texture to be used if nothing is provided. */
export const defaultRoomTexture = { url: 'rooms/textures/hardwood.png', scale: 400 };

/**
 * A Room is the combination of a Floorplan with a floor plane.
 */
export class Room extends EventDispatcher {
    /**
     *  ordered CCW
     */
    constructor(floorplan, corners) {
        super();
        this._name = 'A New Room';
        this.min = null;
        this.max = null;
        this.center = null;
        this.area = 0.0;
        this.areaCenter = null;
        this._polygonPoints = [];
        this.__walls = [];

        this.floorplan = floorplan;
        this._corners = corners;
        this.interiorCorners = [];
        this.interiorCorners3D = [];
        this.floorRectangleSize = new Vector2();
        this.edgePointer = null;
        this.floorPlane = null;
        this.roofPlane = null;
        this.customTexture = false;
        this.floorChangeCallbacks = null;

        this.__destroyed = false;

        this.__isLocked = false;

        this.updateWalls();
        this.updateInteriorCorners();
        this.generateFloorPlane();
        this.generateRoofPlane();

        let cornerids = [];
        let i = 0;

        this.__roomUpdatedEvent = this._roomUpdated.bind(this);
        this.__wallsChangedEvent = this.__wallsChanged.bind(this);

        for (; i < this.corners.length; i++) {
            let c = this.corners[i];
            c.attachRoom(this);
            cornerids.push(c.id);
            c.addEventListener(EVENT_MOVED, this.__roomUpdatedEvent);
            c.addEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, this.__roomUpdatedEvent);
        }

        for (i = 0; i < this.__walls.length; i++) {
            let wall = this.__walls[i];
            // wall.addRoom(this);
            wall.addEventListener(EVENT_UPDATED, this.__wallsChangedEvent);
        }
        this._roomByCornersId = cornerids.join(',');
    }

    __wallsChanged(evt) {
        this.dispatchEvent({ type: EVENT_CHANGED, item: this });
        this.updateInteriorCorners();
    }

    _roomUpdated() {
        this.updateInteriorCorners();
        this.updateArea();
        this.generateFloorPlane();
        this.generateRoofPlane();
    }

    destroy() {
        let i = 0;
        for (; i < this.corners.length; i++) {
            let c = this.corners[i];
            c.removeEventListener(EVENT_MOVED, this.__roomUpdatedEvent);
        }
        for (i = 0; i < this.__walls.length; i++) {
            let wall = this.__walls[i];
            wall.removeEventListener(EVENT_UPDATED, this.__wallsChangedEvent);
        }
        this.__destroyed = true;
        this.dispatchEvent({ type: EVENT_CHANGED, item: this });
    }

    __getOrderedCorners(wall) {
        let i = this.corners.indexOf(wall.start);
        let j = this.corners.indexOf(wall.end);
        if (i === -1 || j === -1) {
            return null;
        }
        let start = this.corners[Math.max(i, j)].location.clone();
        let end = this.corners[Math.min(i, j)].location.clone();
        if ((i === 0 && j === this.corners.length - 1) || (j === 0 && i === this.corners.length - 1)) {
            end = this.corners[this.corners.length - 1].location.clone();
            start = this.corners[0].location.clone();
        }
        return { 'start': start, 'end': end };
    }

    getWallDirection(wall) {
        let orderedCorners = this.__getOrderedCorners(wall);
        if (orderedCorners === null) {
            return null;
        }
        let start = orderedCorners['start'];
        let end = orderedCorners['end'];
        let vect = end.sub(start);
        let vect3 = new Vector3(vect.x, vect.y, 0);
        return vect3.normalize().clone();
    }

    getWallOutDirection(wall) {
        let vect3 = this.getWallDirection(wall); //new Vector3(vect.x, vect.y, 0);
        if (vect3 === null) {
            return null;
        }
        // console.log('WALL DIRECTION : ', vect3);
        vect3 = vect3.applyAxisAngle(new Vector3(0, 0, 1), Math.PI * 0.5);
        // console.log('WALL NORMAL DIRECTION : ', vect3);
        return vect3.normalize();
    }

    getWallStart(wall) {
        let orderedCorners = this.__getOrderedCorners(wall);
        if (orderedCorners === null) {
            return null;
        }
        return orderedCorners['start'];
    }

    getWallEnd(wall) {
        let orderedCorners = this.__getOrderedCorners(wall);
        if (orderedCorners === null) {
            return null;
        }
        return orderedCorners['end'];
    }

    getWallPlane(wall) {
        let orderedCorners = this.__getOrderedCorners(wall);
        if (orderedCorners === null) {
            return null;
        }
        let planeLocation = wall.start.location.clone().add(wall.end.location).multiplyScalar(0.5);
        let normal = this.getWallOutDirection(wall);
        let plane = new Plane(normal, 0);
        let m = new Matrix4();
        m.makeTranslation(planeLocation.x, planeLocation.y, 0);
        // plane = plane.applyMatrix4(m);
        plane.setFromNormalAndCoplanarPoint(normal, new Vector3(planeLocation.x, planeLocation.y, 0));
        return plane;
    }

    roomIdentifier() {
        let cornerids = [];
        this.corners.forEach((corner) => {
            cornerids.push(corner.id);
        });
        let ids = cornerids.join(',');
        return ids;
    }

    getUuid() {
        let cornerUuids = Utils.map(this.corners, function (c) { return c.id; });
        cornerUuids.sort();
        return cornerUuids.join();
    }

    fireOnFloorChange(callback) {
        this.floorChangeCallbacks.add(callback);
    }

    setRoomWallsTexture(textureUrl, textureStretch, textureScale) {
        let edge = this.edgePointer;
        let iterateWhile = true;
        edge.setTexture(textureUrl, textureStretch, textureScale);
        while (iterateWhile) {
            if (edge.next === this.edgePointer) {
                break;
            } else {
                edge = edge.next;
            }
            edge.setTexture(textureUrl, textureStretch, textureScale);
        }
    }

    /**
     * @deprecated
     * textureStretch always true, just an argument for consistency with walls
     */
    setTexture(textureUrl, textureStretch, textureScale) {
        let uuid = this.getUuid();
        this.floorplan.setFloorTexture(uuid, textureUrl, textureScale);
        this.dispatchEvent({ type: EVENT_CHANGED, item: this });
        //		this.floorChangeCallbacks.fire();
    }

    setRoomWallsTextureMaps(texturePack) {
        let edge = this.edgePointer;
        let iterateWhile = true;
        if (!texturePack.color) {
            texturePack.color = '#FFFFFF';
        }
        if (!texturePack.repeat) {
            texturePack.repeat = TEXTURE_DEFAULT_REPEAT; //For every TEXTURE_DEFAULT_REPEAT cms
        }
        edge.setTextureMaps(texturePack);
        while (iterateWhile) {
            if (edge.next === this.edgePointer) {
                break;
            } else {
                edge = edge.next;
            }
            edge.setTextureMaps(texturePack);
        }
    }


    setRoomWallsTextureMapsAttribute(attribute, value) {
        let edge = this.edgePointer;
        let iterateWhile = true;
        edge.setTextureMapAttribute(attribute, value);

        while (iterateWhile) {
            if (edge.next === this.edgePointer) {
                break;
            } else {
                edge = edge.next;
            }
            edge.setTextureMapAttribute(attribute, value);
        }
    }

    setTextureMaps(texturePack) {
        let uuid = this.getUuid();
        if (!texturePack.color) {
            texturePack.color = '#FFFFFF';
        }
        if (!texturePack.repeat) {
            texturePack.repeat = TEXTURE_DEFAULT_REPEAT; //For every TEXTURE_DEFAULT_REPEAT cms
        }
        this.floorplan.setFloorTexture(uuid, texturePack);
        this.dispatchEvent({ type: EVENT_UPDATE_TEXTURES, item: this });
    }

    setTextureMapAttribute(attribute, value) {
        if (attribute && value) {
            let uuid = this.getUuid();
            let texturePack = this.getTexture();
            texturePack[attribute] = value;
            this.floorplan.setFloorTexture(uuid, texturePack);
            this.dispatchEvent({ type: EVENT_MODIFY_TEXTURE_ATTRIBUTE, item: this, attribute: attribute, value: value });
        }
    }

    getTexture() {
        let uuid = this.getUuid();
        let tex = this.floorplan.getFloorTexture(uuid);
        if (!tex) {
            this.floorplan.setFloorTexture(uuid, defaultFloorTexture);
        }
        return tex || defaultFloorTexture;
    }

    generateRoofPlane() {
        // setup texture
        let geometry = new Geometry();

        this.corners.forEach((corner) => {
            let vertex = new Vector3(corner.location.x, corner.elevation, corner.location.y);
            geometry.vertices.push(vertex);
        });
        for (let i = 2; i < geometry.vertices.length; i++) {
            let face = new Face3(0, i - 1, i);
            geometry.faces.push(face);
        }
        // geometry.computeBoundingBox();
        // geometry.computeFaceNormals();

        if (!this.roofPlane) {
            let buffGeometry = new BufferGeometry().fromGeometry(geometry);
            this.roofPlane = new Mesh(buffGeometry, new MeshBasicMaterial({ side: DoubleSide, visible: false }));
        } else {
            this.roofPlane.geometry.dispose();
            this.roofPlane.geometry = new BufferGeometry().fromGeometry(geometry); //this.roofPlane.geometry.fromGeometry(geometry);            
        }
        this.roofPlane.geometry.computeBoundingBox();
        this.roofPlane.geometry.computeFaceNormals();

        this.roofPlane.room = this;
    }

    generateFloorPlane() {
        let points = [];
        this.interiorCorners.forEach((corner) => {
            points.push(new Vector2(corner.x, corner.y));
        });
        let shape = new Shape(points);
        let geometry = new ShapeGeometry(shape);

        if (!this.floorPlane) {
            let buffGeometry = new BufferGeometry().fromGeometry(geometry);
            this.floorPlane = new Mesh(buffGeometry, new MeshBasicMaterial({ side: DoubleSide, visible: false }));
        } else {
            this.floorPlane.geometry.dispose();
            this.floorPlane.geometry = new BufferGeometry().fromGeometry(geometry); //this.floorPlane.geometry.fromGeometry(geometry);
        }

        //The below line was originally setting the plane visibility to false
        //Now its setting visibility to true. This is necessary to be detected
        //with the raycaster objects to click walls and floors.
        this.floorPlane.visible = true;
        this.floorPlane.rotation.set(Math.PI / 2, 0, 0);
        this.floorPlane.geometry.computeBoundingBox();
        this.floorPlane.geometry.computeFaceNormals();
        this.floorPlane.room = this; // js monkey patch

        let b3 = new Box3();
        b3.setFromObject(this.floorPlane);
        this.min = b3.min.clone();
        this.max = b3.max.clone();
        this.center = this.max.clone().sub(this.min).multiplyScalar(0.5).add(this.min);
    }

    cycleIndex(index) {
        if (index < 0) {
            return index += this.corners.length;
        } else {
            return index % this.corners.length;
        }
    }

    pointInRoom(pt) {
        let polygon = [];
        this.corners.forEach((corner) => {
            let co = new Vector2(corner.x, corner.y);
            polygon.push(co);
        });
        return Utils.pointInPolygon2(pt, polygon);
    }

    updateInteriorCorners() {
        let minB = new Vector2(Number.MAX_VALUE, Number.MAX_VALUE);
        let maxB = new Vector2(-Number.MAX_VALUE, -Number.MAX_VALUE);
        let edge = this.edgePointer;
        let iterateWhile = true;
        this.interiorCorners = [];
        this.interiorCorners3D = [];
        while (iterateWhile) {
            let iStart = edge.interiorStart();
            let cStart = edge.getStart();
            minB.x = Math.min(iStart.x, minB.x);
            minB.y = Math.min(iStart.y, minB.y);
            maxB.x = Math.max(maxB.x, iStart.x);
            maxB.y = Math.max(maxB.y, iStart.y);
            this.interiorCorners.push(iStart);
            this.interiorCorners3D.push(new Vector3(iStart.x, cStart.elevation, iStart.y));
            edge.generatePlane();
            if (edge.next === this.edgePointer) {
                break;
            } else {
                if(edge.next.wall.thickness !== edge.wall.thickness){
                    let iEnd = edge.interiorEnd();
                    let cEnd = edge.getEnd();
                    this.interiorCorners.push(iEnd);
                    this.interiorCorners3D.push(new Vector3(iEnd.x, cEnd.elevation, iEnd.y));
                }
                edge = edge.next;
            }
        }
        this.floorRectangleSize = maxB.clone().sub(minB);
    }

    updateArea() {
        let oldarea = this.area;
        let points = [];
        let allpoints = [];
        this.areaCenter = new Vector2();
        this._polygonPoints = [];

        let firstCorner, secondCorner, wall, i, corner, region;

        for (i = 0; i < this.corners.length; i++) {
            corner = this.corners[i];
            firstCorner = this.corners[i];
            secondCorner = this.corners[(i + 1) % this.corners.length];
            wall = firstCorner.wallToOrFrom(secondCorner);

            if (wall != null) {
                if (wall.wallType === WallTypes.CURVED) {
                    let begin = corner.location.clone().sub(wall.bezier.get(0)).length();
                    let p;
                    let stepIndex;
                    allpoints.push(corner.location.clone());

                    if (begin < 1e-6) {
                        for (stepIndex = 1; stepIndex < 20; stepIndex++) {
                            p = wall.bezier.get(stepIndex / 20);
                            allpoints.push(new Vector2(p.x, p.y));
                        }
                    } else {
                        for (stepIndex = 19; stepIndex > 0; stepIndex--) {
                            p = wall.bezier.get(stepIndex / 20);
                            allpoints.push(new Vector2(p.x, p.y));
                        }
                    }
                } else {
                    allpoints.push(corner.location.clone());
                }
            } else {
                allpoints.push(corner.location.clone());
            }
        }

        points = allpoints;
        region = new Region(points);
        this.area = Math.abs(region.area());
        this.areaCenter = region.centroid();
        this._polygonPoints = points;

        //Update the planes for intersection purposes
        this.generateFloorPlane();
        this.generateRoofPlane();

        this.dispatchEvent({ type: EVENT_ROOM_ATTRIBUTES_CHANGED, item: this, info: { from: oldarea, to: this.area } });
    }

    updateArea2() {
        let scope = this;
        let isComplexRoom = false;
        let oldarea = this.area;
        let points = [];
        let N = 0;
        let area = 0;
        this.areaCenter = new Vector2();
        this._polygonPoints = [];

        //The below makes this routine too slow
        //		this.updateWalls();
        //		this.updateInteriorCorners();
        //		this.generateFloorPlane();
        //		this.generateRoofPlane();


        for (let i = 0; i < this.corners.length; i++) {
            let firstCorner = this.corners[i];
            let secondCorner = this.corners[(i + 1) % this.corners.length];
            let wall = firstCorner.wallToOrFrom(secondCorner);
            isComplexRoom |= (wall.wallType === WallTypes.CURVED);
        }

        let inext, a, b, ax_by, ay_bx, delta;
        if (!isComplexRoom) {
            this.corners.forEach((corner) => {
                let co = new Vector2(corner.x, corner.y);
                scope.areaCenter.add(co);
                points.push(co);
            });
            this.areaCenter.multiplyScalar(1.0 / points.length);
            for (let i = 0; i < points.length; i++) {
                inext = (i + 1) % points.length;
                a = points[i];
                b = points[inext];
                ax_by = (a.x * b.y);
                ay_bx = (a.y * b.x);
                delta = ax_by - ay_bx;
                area += delta;
            }
            this.area = Math.abs(area) * 0.5;
            this._polygonPoints = points;
            this.dispatchEvent({ type: EVENT_ROOM_ATTRIBUTES_CHANGED, item: this, info: { from: oldarea, to: this.area } });
            return;
        }


        //		this.corners.forEach((corner) => {
        //			var co = new Vector2(corner.x,corner.y);
        //			this.areaCenter.add(co);
        //			points.push(co);
        //		});

        N = this.corners.length;

        for (let i = 0; i < this.corners.length; i++) {
            let firstCorner = this.corners[i];
            let secondCorner = this.corners[(i + 1) % this.corners.length];
            let wall = firstCorner.wallToOrFrom(secondCorner);
            this.areaCenter.add(firstCorner.location);

            if (wall != null) {
                if (wall.wallType === WallTypes.CURVED) {
                    points.push(firstCorner.location);
                    let LUT = wall.bezier.getLUT(20);
                    for (let j = 1; j < LUT.length - 1; j++) {
                        let p = LUT[j];
                        p = new Vector2(p.x, p.y);
                        points.push(p);
                    }
                } else {
                    points.push(firstCorner.location);
                }
            } else {
                points.push(firstCorner.location);
            }
        }

        this.areaCenter.multiplyScalar(1.0 / N);

        let indicesAndAngles = Utils.getCyclicOrder(points, this.areaCenter);
        points = indicesAndAngles['points'];

        for (let i = 0; i < points.length; i++) {
            inext = (i + 1) % points.length;
            a = points[i];
            b = points[inext];
            //Another irregular polygon method based on the url below
            //https://www.mathsisfun.com/geometry/area-irregular-polygons.html
            //			var width = a.x - b.x;
            //			var height = (a.y + b.y) * 0.5;
            //			var delta = Math.abs(width * height);
            ax_by = (a.x * b.y);
            ay_bx = (a.y * b.x);
            delta = ax_by - ay_bx;
            area += delta;
        }
        this._polygonPoints = points;
        this.area = Math.abs(area) * 0.5;
        //		if we are using the method in url https://www.mathsisfun.com/geometry/area-irregular-polygons.html 
        //		then we dont have to multiply the area by 0.5;
        //		this.area = Math.abs(area);
        this.dispatchEvent({ type: EVENT_ROOM_ATTRIBUTES_CHANGED, item: this, info: { from: oldarea, to: this.area } });
    }

    hasAllCornersById(ids) {
        let sum = 0;
        for (let i = 0; i < ids.length; i++) {
            sum += this.hasACornerById(ids[i]);
        }
        return (sum === this.corners.length);
    }

    hasACornerById(id) {
        for (let i = 0; i < this.corners.length; i++) {
            let corner = this.corners[i];
            if (corner.id === id) {
                return 1;
            }
        }
        return 0;
    }

    /**
     * Populates each wall's half edge relating to this room
     * this creates a fancy doubly connected edge list (DCEL)
     */
    updateWalls() {

        let prevEdge = null;
        let firstEdge = null;
        this.__walls = [];

        for (let i = 0; i < this.corners.length; i++) {

            let firstCorner = this.corners[i];
            let secondCorner = this.corners[(i + 1) % this.corners.length];

            // find if wall is heading in that direction
            let wallTo = firstCorner.wallTo(secondCorner);
            let wallFrom = firstCorner.wallFrom(secondCorner);
            let edge = null;
            if (wallTo) {
                edge = new HalfEdge(this, wallTo, true);
            } else if (wallFrom) {
                edge = new HalfEdge(this, wallFrom, false);
            } else {
                // something horrible has happened
                console.log('corners arent connected by a wall, uh oh');
            }

            /**
             * Ensure the room contains the list of wall pointers
             */
            if (!this.__walls.includes(wallTo) && wallTo) {
                this.__walls.push(wallTo);
                wallTo.addRoom(this);
            }
            if (!this.__walls.includes(wallFrom) && wallFrom) {
                this.__walls.push(wallFrom);
                wallFrom.addRoom(this);
            }

            if (i === 0) {
                firstEdge = edge;
            } else {
                edge.prev = prevEdge;
                prevEdge.next = edge;
                if (i + 1 === this.corners.length) {
                    firstEdge.prev = edge;
                    edge.next = firstEdge;
                }
            }
            prevEdge = edge;
        }

        // hold on to an edge reference
        this.edgePointer = firstEdge;
    }

    set isLocked(flag) {
        this.__isLocked = flag;
    }

    get isLocked() {
        return this.__isLocked;
    }

    get uuid() {
        return this.getUuid();
    }

    get corners() {
        return this._corners;
    }

    get sharedWalls() {
        return this.__walls;
    }

    get roomCornerPoints() {
        return this._polygonPoints;
    }

    get roomByCornersId() {
        return this._roomByCornersId;
    }

    set name(value) {
        let oldname = this._name;
        this._name = value;
        this.dispatchEvent({ type: EVENT_ROOM_ATTRIBUTES_CHANGED, item: this, info: { from: oldname, to: this._name } });
    }
    get name() {
        return this._name;
    }
}
export default Room;