import { EventDispatcher, Vector2, Vector3, Plane } from 'three';
import Bezier from 'bezier-js';
import { WallTypes, defaultWallTexture } from '../core/constants.js';
import { EVENT_ACTION, EVENT_MOVED, EVENT_DELETED, EVENT_UPDATED, EVENT_CORNER_ATTRIBUTES_CHANGED } from '../core/events.js';
import { Configuration, configWallThickness, configWallHeight } from '../core/configuration.js';
import { Utils } from '../core/utils.js';
import { InWallItem } from '../items/in_wall_item.js';
import { InWallFloorItem } from '../items/in_wall_floor_item.js';
import { WallItem } from '../items/wall_item.js';
import { WallFloorItem } from '../items/wall_floor_item.js';
import { Matrix4 } from 'three/build/three.module';


/** The default wall texture. */
// export const defaultWallTexture = { url: 'rooms/textures/wallmap.png', stretch: true, scale: 0 };

const UP_VECTOR = new Vector3(0, 0, 1);
/**
 * A Wall is the basic element to create Rooms.
 *
 * Walls consists of two half edges.
 */
export class Wall extends EventDispatcher {
    /**
     * Constructs a new wall.
     * @param start Start corner.
     * @param end End corner.
     */
    constructor(start, end, aa, bb) {
        super();
        this.start = start;
        this.end = end;
        this.name = 'wall';
        if (!aa && !bb) {
            this._walltype = WallTypes.STRAIGHT;
        } else {
            this._walltype = WallTypes.CURVED;
        }
        let o = new Vector2(0, 0);
        let abvector = end.location.clone().sub(start.location).multiplyScalar(0.5);

        let ab135plus = abvector.clone().rotateAround(o, Math.PI * 0.75);
        let ab45plus = abvector.clone().rotateAround(o, Math.PI * 0.25);

        if (aa) {
            this._a = new Vector2(0, 0);
            this._a.x = aa.x;
            this._a.y = aa.y;
        } else {
            this._a = start.location.clone().add(ab45plus);
        }

        if (bb) {
            this._b = new Vector2(0, 0);
            this._b.x = bb.x;
            this._b.y = bb.y;
        } else {
            this._b = end.location.clone().add(ab135plus);
        }
        this._a_vector = this._a.clone().sub(start.location);
        this._b_vector = this._b.clone().sub(start.location);

        this._bezier = new Bezier(start.location.x, start.location.y, this._a.x, this._a.y, this._b.x, this._b.y, end.location.x, end.location.y);

        this.id = this.getUuid();

        this.start.attachStart(this);
        this.end.attachEnd(this);

        /** Front is the plane from start to end. */
        this.__frontEdge = null;

        /** Back is the plane from end to start. */
        this.__backEdge = null;

        this.__attachedRooms = [];

        /** */
        this.orphan = false;

        /** Items attached to this wall */
        this.items = [];

        /** */
        this.onItems = [];

        this.__onWallItems = [];
        this.__inWallItems = [];

        this.__onWallItemsSnappedRatios = [];
        this.__inWallItemsSnappedRatios = [];

        /** The front-side texture. */
        this.frontTexture = defaultWallTexture;

        /** The back-side texture. */
        this.backTexture = defaultWallTexture;

        /** Wall thickness. */
        this._thickness = Configuration.getNumericValue(configWallThickness);

        /** Wall height. */
        this.height = Configuration.getNumericValue(configWallHeight);

        /** Actions to be applied after movement. */
        this.moved_callbacks = null;

        /** Actions to be applied on removal. */
        this.deleted_callbacks = null;

        /** Actions to be applied explicitly. */
        this.action_callbacks = null;

        this.__isLocked = false;

        this.__location = new Vector2();
        this.__wallPlane2D = new Plane();
        this.__wallNormal2D = new Vector2();

        this.__cornerMovedEvent = this.__cornerMoved.bind(this);
        this.__cornerAttributesChangedEvent = this.__cornerAttributesChanged.bind(this);
        this.__cornerDeletedEvent = this.__cornerDeleted.bind(this);

        //		this.start.addEventListener(EVENT_MOVED, ()=>{
        //			scope.updateControlVectors();
        //		});
        //		this.end.addEventListener(EVENT_MOVED, ()=>{
        //			scope.updateControlVectors();
        //		});
        this.addCornerMoveListener(this.start);
        this.addCornerMoveListener(this.end);
    }


    __updateItemPositions() {
        // let i = 0;
        // let vect = this.end.location.clone().sub(this.start.location);
        // this.__onWallItems.forEach((item) => {
        //     let snappedRatio = this.__onWallItemsSnappedRatios[i];
        //     let newPosition = vect.clone().multiplyScalar(snappedRatio).add(this.start.location);
        //     item.position = new Vector3(newPosition.x, item.position.y, newPosition.y);
        //     i++;
        // });
        // i = 0;
        // this.__inWallItems.forEach((item) => {
        //     let snappedRatio = this.__inWallItemsSnappedRatios[i];
        //     let newPosition = vect.clone().multiplyScalar(snappedRatio).add(this.start.location);
        //     item.position = new Vector3(newPosition.x, item.position.y, newPosition.y);
        //     i++;
        // });
    }

    __cornerMoved() {
        this.updateControlVectors();
        this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
    }

    __cornerAttributesChanged() {
        this.__updateItemPositions();
        this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
    }

    __cornerDeleted(evt) {
        this.addCornerMoveListener(evt.item, true);
        this.remove();
    }

    addItem(item) {
        if (item instanceof InWallItem || item instanceof InWallFloorItem) {
            if (!Utils.hasValue(this.__inWallItems, item)) {
                this.__inWallItems.push(item);
            }
            this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
        }

        if (item instanceof WallItem || item instanceof WallFloorItem) {
            if (!Utils.hasValue(this.__onWallItems, item)) {
                this.__onWallItems.push(item);
            }
            this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
        }
    }

    removeItem(item) {
        if (item instanceof InWallItem || item instanceof InWallFloorItem) {
            if (Utils.hasValue(this.__inWallItems, item)) {
                Utils.removeValue(this.__inWallItems, item);
            }
            this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
        }
        if (item instanceof WallItem || item instanceof WallFloorItem) {
            if (Utils.hasValue(this.__onWallItems, item)) {
                Utils.removeValue(this.__onWallItems, item);
            }
            this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
        }
    }

    addCornerMoveListener(corner, remove = false) {
        if (remove) {
            corner.removeEventListener(EVENT_MOVED, this.__cornerMovedEvent);
            corner.removeEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, this.__cornerAttributesChangedEvent);
            corner.removeEventListener(EVENT_DELETED, this.__cornerDeletedEvent);
            return;
        }
        corner.addEventListener(EVENT_MOVED, this.__cornerMovedEvent);
        corner.addEventListener(EVENT_CORNER_ATTRIBUTES_CHANGED, this.__cornerAttributesChangedEvent);
        corner.addEventListener(EVENT_DELETED, this.__cornerDeletedEvent);
    }

    projectOnWallPlane(pt2d) {
        let projected3D = new Vector3();
        projected3D = this.__wallPlane2D.projectPoint(new Vector3(pt2d.x, pt2d.y, 0), projected3D);
        return new Vector2(projected3D.x, projected3D.y);
    }

    updateControlVectors() {
        //Update the location as a mid point between two corners
        let s = this.start.location.clone();
        let e = this.end.location.clone();
        let vect = e.clone().sub(s.clone());
        let halfVect = vect.clone().multiplyScalar(0.5);
        let midPoint = s.clone().add(halfVect);
        this.__location = midPoint.clone();

        //Update the wall plane in a 2D sense
        let vect3d = new Vector3(vect.x, vect.y, 0);
        let normal = vect3d.clone().normalize().cross(UP_VECTOR);
        this.__wallPlane2D = this.__wallPlane2D.setFromNormalAndCoplanarPoint(normal, new Vector3(midPoint.x, midPoint.y, 0));
        this.__wallNormal2D.x = vect3d.x;
        this.__wallNormal2D.y = vect3d.y;

        // console.log(this.__wallPlane2D.normal, this.__wallPlane2D.constant);

        this._bezier.points[0].x = this.start.location.x;
        this._bezier.points[0].y = this.start.location.y;

        this._bezier.points[1].x = this.a.x;
        this._bezier.points[1].y = this.a.y;

        this._bezier.points[2].x = this.b.x;
        this._bezier.points[2].y = this.b.y;

        this._bezier.points[3].x = this.end.location.x;
        this._bezier.points[3].y = this.end.location.y;
        this._bezier.update();
        if (this.getStart() || this.getEnd()) {
            (this.getStart() != null) ? this.getStart().floorplan.update(false): (this.getEnd() != null) ? this.getEnd().floorplan.update(false) : false;
        }
        //		this._a_vector = this._a.clone().sub(this.start.location);
        //		this._b_vector = this._b.clone().sub(this.start.location);
    }

    getUuid() {
        return [this.start.id, this.end.id].join();
    }

    resetFrontBack() {
        if (this.frontEdge) {
            this.frontEdge.destroy();
        }
        if (this.backEdge) {
            this.backEdge.destroy();
        }
        this.frontEdge = null;
        this.backEdge = null;
        this.orphan = false;
        this.__attachedRooms = [];
    }

    snapToAxis(tolerance) {
        // order here is important, but unfortunately arbitrary
        this.start.snapToAxis(tolerance);
        this.end.snapToAxis(tolerance);
    }

    fireOnMove(func) {
        this.moved_callbacks.add(func);
    }

    fireOnDelete(func) {
        this.deleted_callbacks.add(func);
    }

    dontFireOnDelete(func) {
        this.deleted_callbacks.remove(func);
    }

    fireOnAction(func) {
        this.action_callbacks.add(func);
    }

    fireAction(action) {
        this.dispatchEvent({ type: EVENT_ACTION, action: action });
        //this.action_callbacks.fire(action);
    }

    move(newX, newY) {
        let dx = newX - ((this.start.location.x + this.end.location.x) * 0.5);
        let dy = newY - ((this.start.location.y + this.end.location.y) * 0.5);
        this.relativeMove(dx, dy);
    }

    relativeMove(dx, dy, corner) {
        if (!corner) {
            this.start.relativeMove(dx, dy);
            this.end.relativeMove(dx, dy);
        } else {
            corner.relativeMove(dx, dy);
        }
        this.updateControlVectors();
    }

    fireMoved() {
        this.dispatchEvent({ type: EVENT_MOVED, item: this, position: null });
    }

    fireRedraw() {
        if (this.frontEdge) {
            //			this.frontEdge.dispatchEvent({type: EVENT_REDRAW});
            this.frontEdge.dispatchRedrawEvent();
            //this.frontEdge.redrawCallbacks.fire();
        }
        if (this.backEdge) {
            //			this.backEdge.dispatchEvent({type: EVENT_REDRAW});
            this.backEdge.dispatchRedrawEvent();
            //this.backEdge.redrawCallbacks.fire();
        }
    }

    set isLocked(flag) {
        this.__isLocked = flag;
    }

    get isLocked() {
        return this.__isLocked;
    }

    set wallSize(value) {
        if (this.wallType === WallTypes.STRAIGHT) {
            let vector = this.getEnd().location.clone().sub(this.getStart().location);
            let currentLength = this.wallLength();
            let changeInLength = value / currentLength;

            let neighboursCountStart = (this.getStart().adjacentCorners().length === 1);
            let neighboursCountEnd = (this.getEnd().adjacentCorners().length === 1);

            let changeInLengthOffset, movementVector, startPoint, endPoint;

            changeInLengthOffset = (changeInLength - 1);

            if ((!neighboursCountStart && !neighboursCountEnd) || (neighboursCountStart && neighboursCountEnd)) {
                changeInLengthOffset *= 0.5;
                movementVector = vector.clone().multiplyScalar(changeInLengthOffset);
                startPoint = movementVector.clone().multiplyScalar(-1).add(this.getStart().location);
                endPoint = movementVector.clone().add(this.getEnd().location);
            } else if (neighboursCountStart) {
                movementVector = vector.clone().multiplyScalar(changeInLengthOffset);
                startPoint = movementVector.clone().multiplyScalar(-1).add(this.getStart().location);
                endPoint = this.getEnd().location;
            } else if (neighboursCountEnd) {
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
        /**
         * No need for the below statement. Because the corners moved will trigger the event to this instance
         * Then this instance will also trigger the move event 
         */
        // this.dispatchEvent({ type: EVENT_UPDATED, item: this });
    }

    get onWallItems() {
        return this.__onWallItems;
    }

    get inWallItems() {
        return this.__inWallItems;
    }

    get attachedRooms() {
        return this.__attachedRooms;
    }

    get thickness() {
        return this._thickness;
    }

    set thickness(thick) {
        this._thickness = thick;
        this.start.move(this.start.location.x, this.start.location.y);
        this.end.move(this.end.location.x, this.end.location.y);
        // this.dispatchEvent({ type: EVENT_UPDATED, item: this }); //This is stupid. You need to say what event exactly happened
    }

    get uuid() {
        return this.getUuid();
    }

    get a() {
        return this._a;
    }

    set a(location) {
        this._a.x = location.x;
        this._a.y = location.y;
        this._a_vector = this._a.clone().sub(this.start.location);
        this.updateControlVectors();
    }

    get b() {
        return this._b;
    }

    set b(location) {
        this._b.x = location.x;
        this._b.y = location.y;
        this._b_vector = this._b.clone().sub(this.start.location);
        this.updateControlVectors();
    }

    get aVector() {
        return this._a_vector.clone();
    }

    get bVector() {
        return this._b_vector.clone();
    }

    get bezier() {
        return this._bezier;
    }

    get wallSize() {
        return this.wallLength();
    }

    get wallType() {
        return this._walltype;
    }

    set wallType(value) {
        if (value === WallTypes.STRAIGHT || value === WallTypes.CURVED) {
            this._walltype = value;
        }
        this.updateControlVectors();
        this.updateAttachedRooms(true);
    }

    get startElevation() {
        if (this.start && this.start != null) {
            return this.start.elevation;
        }
        return 0.0;
    }

    get endElevation() {
        if (this.end && this.end != null) {
            return this.end.elevation;
        }
        return 0.0;
    }

    get location() {
        return this.__location;
    }

    set location(vec2) {
        let s = this.start.location.clone();
        let e = this.end.location.clone();
        let vect = e.clone().sub(s);
        let midPoint = s.clone().add(vect.clone().multiplyScalar(0.5));
        let vectorSToMid = s.clone().sub(midPoint);
        let vectorEToMid = e.clone().sub(midPoint);
        let sNewLocation = vec2.clone().add(vectorSToMid);
        let eNewLocation = vec2.clone().add(vectorEToMid);
        this.start.move(sNewLocation.x, sNewLocation.y);
        this.end.move(eNewLocation.x, eNewLocation.y);
        this.__location = vec2;
    }

    getStart() {
        return this.start;
    }

    getEnd() {
        return this.end;
    }

    getStartX() {
        return this.start.getX();
    }

    getEndX() {
        return this.end.getX();
    }

    getStartY() {
        return this.start.getY();
    }

    getEndY() {
        return this.end.getY();
    }

    wallDirection() {
        let vector = this.end.location.clone().sub(this.start.location);
        return vector;
    }

    wallDirectionNormalized() {
        return this.wallDirection().normalize();
    }

    wallDirection3() {
        let wd = this.wallDirection();
        return new Vector3(wd.x, wd.y, 0);
    }

    wallDirectionNormalized3() {
        let wd3 = this.wallDirection3();
        return wd3.normalize();
    }

    wallLength() {
        if (this.wallType === WallTypes.STRAIGHT) {
            let start = this.getStart();
            let end = this.getEnd();
            return Utils.distance(start, end);
        } else if (this.wallType === WallTypes.CURVED) {
            return this._bezier.length();
        }
        return -1;
    }

    wallCenter() {
        if (this.wallType === WallTypes.STRAIGHT) {
            return new Vector2((this.getStart().x + this.getEnd().x) / 2.0, (this.getStart().y + this.getEnd().y) / 2.0);
        } else if (this.wallType === WallTypes.CURVED) {
            let p = this._bezier.get(0.5);
            return new Vector2(p.x, p.y);
        }
        return new Vector2(0, 0);
    }

    remove() {
        this.start.detachWall(this);
        this.end.detachWall(this);

        //Remove the listeners also
        this.addCornerMoveListener(this.start, true);
        this.addCornerMoveListener(this.end, true);

        this.dispatchEvent({ type: EVENT_DELETED, item: this });
        //this.deleted_callbacks.fire(this);
    }

    setStart(corner) {
        this.start.detachWall(this);
        this.addCornerMoveListener(this.start, true);

        corner.attachStart(this);
        this.start = corner;
        this.addCornerMoveListener(this.start);
        this.fireMoved();
    }

    setEnd(corner) {

        this.end.detachWall(this);
        this.addCornerMoveListener(this.end);

        corner.attachEnd(this);
        this.end = corner;
        this.addCornerMoveListener(this.end, true);
        this.fireMoved();
    }

    distanceFrom(point) {
        if (this.wallType === WallTypes.STRAIGHT) {
            return Utils.pointDistanceFromLine(point, new Vector2(this.getStartX(), this.getStartY()), new Vector2(this.getEndX(), this.getEndY()));
        } else if (this.wallType === WallTypes.CURVED) {
            let p = this._bezier.project(point);
            let projected = new Vector2(p.x, p.y);
            return projected.distanceTo(point);
        }
        return -1;
    }

    /** Return the corner opposite of the one provided.
     * @param corner The given corner.
     * @returns The opposite corner.
     */
    oppositeCorner(corner) {
        if (this.start === corner) {
            return this.end;
        } else if (this.end === corner) {
            return this.start;
        } else {
            console.log('Wall does not connect to corner');
            return null;
        }
    }

    getClosestCorner(point) {
        let startVector = new Vector2(this.start.x, this.start.y);
        let endVector = new Vector2(this.end.x, this.end.y);
        let startDistance = point.distanceTo(startVector);
        let endDistance = point.distanceTo(endVector);
        if (startDistance <= (this.thickness * 2)) {
            return this.start;
        } else if (endDistance <= (this.thickness * 2)) {
            return this.end;
        }
        return null;
    }

    updateAttachedRooms(explicit = false) {
        if (this.start != null) {
            this.start.updateAttachedRooms(explicit);
        }
        if (this.end) {
            this.end.updateAttachedRooms(explicit);
        }
    }

    addRoom(room) {
        this.__attachedRooms.push(room);
    }

    clearAttachedRooms() {
        this.__attachedRooms = [];
    }

    get frontEdge() {
        return this.__frontEdge;
    }

    set frontEdge(edge) {
        if (this.__frontEdge) {
            this.__frontEdge.destroy();
        }
        this.__frontEdge = edge;
        this.__inWallItems.forEach((item) => {
            item.newWallEdge();
        });
        this.__onWallItems.forEach((item) => {
            item.newWallEdge();
        });
        this.dispatchEvent({ type: EVENT_UPDATED, item: this });
    }

    get backEdge() {
        return this.__backEdge;
    }

    set backEdge(edge) {
        if (this.__backEdge) {
            this.__backEdge.destroy();
        }
        this.__backEdge = edge;
        this.__inWallItems.forEach((item) => {
            item.newWallEdge();
        });
        this.__onWallItems.forEach((item) => {
            item.newWallEdge();
        });
        this.dispatchEvent({ type: EVENT_UPDATED, item: this });
    }
}

export default Wall;