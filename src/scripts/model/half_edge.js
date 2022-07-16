import { EventDispatcher, Vector2, Vector3, Matrix4, Face3, Mesh, Geometry, MeshBasicMaterial, Box3, BufferGeometry, Plane } from 'three';
import { EVENT_REDRAW, EVENT_MOVED, EVENT_UPDATED, EVENT_UPDATE_TEXTURES, EVENT_DELETED, EVENT_MODIFY_TEXTURE_ATTRIBUTE, EVENT_CHANGED } from '../core/events.js';
import { Utils } from '../core/utils.js';
import { WallTypes, TEXTURE_DEFAULT_REPEAT } from '../core/constants.js';

/**
 * Half Edges are created by Room.
 *
 * Once rooms have been identified, Half Edges are created for each interior wall.
 *
 * A wall can have two half edges if it is visible from both sides.
 */
export class HalfEdge extends EventDispatcher {
    /**
     * Constructs a half edge.
     * @param {Room} room The associated room. Instance of Room
     * @param {Wall} wall The corresponding wall. Instance of Wall
     * @param {boolean} front True if front side. Boolean value
     */
    constructor(room, wall, front) {
        super();

        /**  The minimum point in space calculated from the bounds
         * @property {Vector3} min  The minimum point in space calculated from the bounds
         * @type {Vector3}
         * @see https://threejs.org/docs/#api/en/math/Vector3
         **/
        this.min = null;

        /**
         * The maximum point in space calculated from the bounds
         * @property {Vector3} max	 The maximum point in space calculated from the bounds
         * @type {Vector3}
         * @see https://threejs.org/docs/#api/en/math/Vector3
         **/
        this.max = null;

        /**
         * The center of this half edge
         * @property {Vector3} center The center of this half edge
         * @type {Vector3}
         * @see https://threejs.org/docs/#api/en/math/Vector3
         **/
        this.center = null;

        /**
         * Reference to a Room instance
         * @property {Room} room Reference to a Room instance
         * @type {Room}
         **/
        this.room = room || null;

        /** 
         *  Reference to a Wall instance
         * @property {Wall} room Reference to a Wall instance
         * @type {Wall}
         **/
        this.wall = wall;

        this.name = Utils.guide('Edge');

        /**
         * Reference to the next halfedge instance connected to this
         * @property {HalfEdge} next Reference to the next halfedge instance connected to this
         * @type {HalfEdge}
         **/
        this.__next = null;

        /**
         * Reference to the previous halfedge instance connected to this
         * @property {HalfEdge} prev Reference to the previous halfedge instance connected to this
         * @type {HalfEdge}
         **/
        this.__prev = null;

        /** 
         * The offset to maintain for the front and back walls from the midline of a wall
         * @property {Number} offset The offset to maintain for the front and back walls from the midline of a wall
         * @type {Number}
         **/
        this.offset = 0.0;

        /**
         *  The height of a wall
         * @property {Number} height The height of a wall
         * @type {Number}
         **/
        this.height = 0.0;

        /**
         * The plane mesh that will be used for checking intersections of wall items
         * @property {Mesh} plane The plane mesh that will be used for checking intersections of wall items
         * @type {Mesh}
         * @see https://threejs.org/docs/#api/en/objects/Mesh
         */
        this.__plane = null;

        this.__exteriorPlane = null;

        /**
         * The interior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @property {Matrix4} interiorTransform The interior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @type {Matrix4} 
         * @see https://threejs.org/docs/#api/en/math/Matrix4
         */
        this.interiorTransform = new Matrix4();

        /**
         * The inverse of the interior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @property {Matrix4} invInteriorTransform The inverse of the interior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @type {Matrix4}
         * @see https://threejs.org/docs/#api/en/math/Matrix4
         */
        this.invInteriorTransform = new Matrix4();

        /**
         * The exterior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @property {Matrix4} exteriorTransform The exterior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @type {Matrix4} 
         * @see https://threejs.org/docs/#api/en/math/Matrix4
         */
        this.exteriorTransform = new Matrix4();

        /**
         * The inverse of the exterior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @property {Matrix4} invExteriorTransform The inverse of the exterior transformation matrix that contains the homogeneous transformation of the plane based on the two corner positions of the wall
         * @type {Matrix4}
         * @see https://threejs.org/docs/#api/en/math/Matrix4
         */
        this.invExteriorTransform = new Matrix4();

        /**
         * This is an array of callbacks to be call when redraw happens
         * @depreceated 
         */
        this.redrawCallbacks = null;

        /**
         * Is this an orphan edge?
         */
        this.__isOrphan = false;

        /**
         * Is this is the front edge or the back edge
         * @property {boolean} front Is this is the front edge or the back edge
         * @type {boolean}
         */
        this.front = front || false;

        this.__vertices = null;
        this.__normal = null; //new Vector3(0, 0, 0);
        this.__mathPlane = null;

        this.__iStart = null;
        this.__iEnd = null;
        this.__iCenter = null;
        this.__iDistance = 0;


        this.__eStart = null;
        this.__eEnd = null;
        this.__eCenter = null;
        this.__eDistance = null;

        this.offset = wall.thickness / 2.0;
        this.height = wall.height;

        this.__wallMovedEvent = this.__wallMoved.bind(this);
        this.__wallUpdatedEvent = this.__wallUpdated.bind(this);

        this.wall.addEventListener(EVENT_MOVED, this.__wallMovedEvent);
        this.wall.addEventListener(EVENT_UPDATED, this.__wallUpdatedEvent);
        if(this.room){
            this.room.addEventListener(EVENT_CHANGED, this.__wallMovedEvent);
        }
        if (this.front) {
            this.wall.frontEdge = this;
        } else {
            this.wall.backEdge = this;
        }
        this.__updateInteriorsExteriors();
    }

    __updateInteriorsExteriors(){
        this.__iStart = this.__interiorStart();
        this.__iEnd = this.__interiorEnd();
        this.__iCenter = this.__interiorCenter();
        this.__iDistance = this.__interiorDistance();

        this.__eStart = this.__exteriorStart();
        this.__eEnd = this.__exteriorEnd();
        this.__eCenter = this.__exteriorCenter();
        this.__eDistance = this.__exteriorDistance();
    }

    __wallMoved(evt) {
        let scope = this;
        this.__updateInteriorsExteriors();
        // scope.computeTransforms(scope.interiorTransform, scope.invInteriorTransform, scope.interiorStart(), scope.interiorEnd());
        // scope.computeTransforms(scope.exteriorTransform, scope.invExteriorTransform, scope.exteriorStart(), scope.exteriorEnd());
        this.generatePlane();
        scope.dispatchEvent({ type: EVENT_REDRAW, item: scope });

    }

    __wallUpdated(evt) {
        let scope = this;
        scope.offset = scope.wall.thickness * 0.5;
        this.__updateInteriorsExteriors();
        // scope.computeTransforms(scope.interiorTransform, scope.invInteriorTransform, scope.interiorStart(), scope.interiorEnd());
        // scope.computeTransforms(scope.exteriorTransform, scope.invExteriorTransform, scope.exteriorStart(), scope.exteriorEnd());
        this.generatePlane();
        scope.dispatchEvent({ type: EVENT_REDRAW, item: scope });
    }

    /**
     * This generates the invisible planes in the scene that are used for interesection testing for the wall items
     */
    __generateEdgePlane(interior = true, plane = null) {
        let geometry = new Geometry();
        let v1 = null;
        let v2 = null;

        if (interior) {
            v1 = this.transformCorner(this.interiorEnd());
            v2 = this.transformCorner(this.interiorStart());
        }
        else {
            v1 = this.transformCorner(this.exteriorStart());
            v2 = this.transformCorner(this.exteriorEnd());
        }

        let v3 = v2.clone();
        let v4 = v1.clone();

        let ab = null;
        let ac = null;
        // v3.y = this.wall.height;
        // v4.y = this.wall.height;

        v3.y = this.wall.startElevation;
        v4.y = this.wall.endElevation;

        ab = v2.clone().sub(v1);
        ac = v3.clone().sub(v1);
        this.__vertices = [v1, v2, v3, v4];
        this.__normal = ab.cross(ac).normalize().negate();
        this.__mathPlane = new Plane();
        this.__mathPlane.setFromNormalAndCoplanarPoint(this.__normal.clone(), this.__vertices[0].clone());

        geometry.vertices = [v1, v2, v3, v4];

        // geometry.faces.push(new Face3(0, 1, 2));
        // geometry.faces.push(new Face3(0, 2, 3));

        geometry.faces.push(new Face3(2, 1, 0));
        geometry.faces.push(new Face3(3, 2, 0));

        geometry.computeFaceNormals();
        geometry.computeBoundingBox();

        if (!plane) {
            plane = new Mesh(new BufferGeometry().fromGeometry(geometry), new MeshBasicMaterial({ visible: true }));
        } else {
            plane.geometry.dispose();
            plane.geometry = new BufferGeometry().fromGeometry(geometry); //this.__plane.geometry.fromGeometry(geometry);
        }

        //The below line was originally setting the plane visibility to false
        //Now its setting visibility to true. This is necessary to be detected
        //with the raycaster objects to click walls and floors.
        plane.visible = true;
        plane.edge = this; // js monkey patch
        plane.wall = this.wall;

        plane.geometry.computeBoundingBox();
        plane.geometry.computeFaceNormals();


        this.computeTransforms(this.interiorTransform, this.invInteriorTransform, this.interiorStart(), this.interiorEnd());
        this.computeTransforms(this.exteriorTransform, this.invExteriorTransform, this.exteriorStart(), this.exteriorEnd());

        let b3 = new Box3();
        b3.setFromObject(plane);
        this.min = b3.min.clone();
        this.max = b3.max.clone();
        this.center = this.max.clone().sub(this.min).multiplyScalar(0.5).add(this.min);

        return plane;
    }

    /**
     * Calculate the transformation matrix for the edge (front/back) baesd on the parameters. 
     * @param {Matrix4} transform The matrix reference in which the transformation is stored
     * @param {Matrix4} invTransform The inverse of the transform that is stored in the invTransform
     * @param {Vector2} start The starting point location
     * @param {Vector2} end The ending point location
     * @see https://threejs.org/docs/#api/en/math/Matrix4
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    computeTransforms(transform, invTransform, start, end) {
        let v1 = start;
        let v2 = end;

        let angle = Utils.angle(new Vector2(1, 0), new Vector2(v2.x - v1.x, v2.y - v1.y));

        let tt = new Matrix4();
        let tr = new Matrix4();

        tt.makeTranslation(-v1.x, 0, -v1.y);
        tr.makeRotationY(-angle);
        transform.multiplyMatrices(tr, tt);
        invTransform.getInverse(transform);
    }

    /** Gets the distance from specified point.
     * @param {Number} x X coordinate of the point.
     * @param {Number} y Y coordinate of the point.
     * @returns {Number} The distance.
     */
    distanceTo(x, y) {
        if (this.wall.wallType === WallTypes.STRAIGHT) {
            // x, y, x1, y1, x2, y2
            return Utils.pointDistanceFromLine(new Vector2(x, y), this.interiorStart(), this.interiorEnd());
        } else if (this.wall.wallType === WallTypes.CURVED) {
            let p = this._bezier.project({ x: x, y: y });
            let projected = new Vector2(p.x, p.y);
            return projected.distanceTo(new Vector2(x, y));
        }
        return -1;
    }

    /**
     * Get the starting corner of the wall this instance represents
     * @return {Corner} The starting corner
     */
    getStart() {
        if (this.front) {
            return this.wall.getStart();
        } else {
            return this.wall.getEnd();
        }
    }

    /**
     * Get the ending corner of the wall this instance represents
     * @return {Corner} The ending corner
     */
    getEnd() {
        if (this.front) {
            return this.wall.getEnd();
        } else {
            return this.wall.getStart();
        }
    }

    /**
     * If this is the front edge then return the back edge. 
     * For example in a wall there are two halfedges, i.e one for front and one back. Based on which side this halfedge lies return the opposite {@link HalfEdge}
     * @return {HalfEdge} The other HalfEdge
     */
    getOppositeEdge() {
        if (this.front) {
            return this.wall.backEdge;
        } else {
            return this.wall.frontEdge;
        }
    }

    __factor(vector, inside=true){
        if(inside){
            return (vector.length() - 10) / vector.length();
        }
        return 10 / vector.length();
    }

    /**
     * Return the 2D interior location that is at the start. 
     * @return {Vector2} Return an object with attributes x, y
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    __interiorStart(debug = false) {
        if (debug) {
            console.log('*************************');
            console.log('CALCULATE INTERIOR START');
        }
        let vec = this.interiorPointByEdges(this.prev, this, debug); //this.interiorPoint(this.prev, true);//        
        // vec = vec.multiplyScalar(0.5);
        // vec = vec.multiplyScalar(this.__factor(vec));
        // vec = vec.clone().normalize().multiplyScalar(vec.length() - 10);
        return this.getStart().location.clone().add(vec);

        // let vec = this.halfAngleVector(this.prev, this);
        // return new Vector2(this.getStart().x + vec.x, this.getStart().y + vec.y);

        // return {x:this.getStart().x + vec.x, y:this.getStart().y + vec.y};
    }

    /**
     * Return the 2D interior location that is at the end. 
     * @return {Vector2} Return an object with attributes x, y
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    // 
    __interiorEnd(debug = false) {
        if (debug) {
            console.log('*************************');
            console.log('CALCULATE INTERIOR END');
        }
        let vec = this.interiorPointByEdges(this, this.next, debug); //this.interiorPoint(this.next, false);//
        // vec = vec.multiplyScalar(0.5);
        // vec = vec.multiplyScalar(this.__factor(vec));
        return this.getEnd().location.clone().add(vec);

        // let vec = this.halfAngleVector(this, this.next);
        // return new Vector2(this.getEnd().x + vec.x, this.getEnd().y + vec.y);

        // return {x:this.getEnd().x + vec.x, y:this.getEnd().y + vec.y};
    }

    /**
     * Return the 2D interior location that is at the center/middle. 
     * @return {Vector2} Return an object with attributes x, y
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    __interiorCenter() {
        if (this.wall.wallType === WallTypes.STRAIGHT) {
            // x, y, x1, y1, x2, y2
            return new Vector2((this.interiorStart().x + this.interiorEnd().x) / 2.0, (this.interiorStart().y + this.interiorEnd().y) / 2.0);
        } else if (this.wall.wallType === WallTypes.CURVED) {
            let c = this.wall.bezier.get(0.5);
            return new Vector2(c.x, c.y);
        }
        return new Vector2((this.interiorStart().x + this.interiorEnd().x) / 2.0, (this.interiorStart().y + this.interiorEnd().y) / 2.0);
    }

    /**
     * Return the interior distance of the interior wall 
     * @return {Number} The distance
     */
    __interiorDistance() {
        let start = this.interiorStart();
        let end = this.interiorEnd();
        if (this.wall.wallType === WallTypes.STRAIGHT) {
            return Utils.distance(start, end);
        } else if (this.wall.wallType === WallTypes.CURVED) {
            return this.wall.bezier.length();
        }
        return Utils.distance(start, end);
    }


    /**
     * Return the 2D exterior location that is at the start. 
     * @return {Vector2} Return an object with attributes x, y
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    __exteriorStart(debug = false) {
        // let vec = this.interiorPointByEdges(this.prev, this); //this.interiorPoint(this.prev, true);//
        // // vec = vec.multiplyScalar(-0.5);
        // // vec = vec.multiplyScalar(-this.__factor(vec, false));
        // return this.getStart().location.clone().add(vec);

        // let vec = this.halfAngleVector(this.prev, this);
        // return new Vector2(this.getStart().x - vec.x, this.getStart().y - vec.y);

        return new Vector2(this.getStart().x, this.getStart().y);
    }

    /**
     * Return the 2D exterior location that is at the end. 
     * @return {Vector2} Return an object with attributes x, y
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    __exteriorEnd(debug = false) {
        // let vec = this.interiorPointByEdges(this, this.next); //this.interiorPoint(this.next, false);//
        // // vec = vec.multiplyScalar(-0.5);
        // // vec = vec.multiplyScalar(-this.__factor(vec, false));
        // return this.getEnd().location.clone().add(vec);

        // let vec = this.halfAngleVector(this, this.next);
        // return new Vector2(this.getEnd().x - vec.x, this.getEnd().y - vec.y);

        return new Vector2(this.getEnd().x, this.getEnd().y);
    }

    /**
     * Return the 2D exterior location that is at the center/middle. 
     * @return {Vector2} Return an object with attributes x, y
     * @see https://threejs.org/docs/#api/en/math/Vector2
     */
    __exteriorCenter() {
        if (this.wall.wallType === WallTypes.STRAIGHT) {
            // x, y, x1, y1, x2, y2
            return new Vector2((this.exteriorStart().x + this.exteriorEnd().x) / 2.0, (this.exteriorStart().y + this.exteriorEnd().y) / 2.0);
        } else if (this.wall.wallType === WallTypes.CURVED) {
            let c = this.wall.bezier.get(0.5);
            return new Vector2(c.x, c.y);
        }
        return new Vector2((this.exteriorStart().x + this.exteriorEnd().x) / 2.0, (this.exteriorStart().y + this.exteriorEnd().y) / 2.0);
    }

    /**
     * Return the exterior distance of the exterior wall 
     * @return {Number} The distance
     */
    __exteriorDistance() {
        let start = this.exteriorStart();
        let end = this.exteriorEnd();
        if (this.wall.wallType === WallTypes.STRAIGHT) {
            return Utils.distance(start, end);
        } else if (this.wall.wallType === WallTypes.CURVED) {
            return this.wall.bezier.length();
        }
        return Utils.distance(start, end);
    }

    interiorStart(){
        return this.__iStart.clone();
    }

    interiorEnd(){
        return this.__iEnd.clone();
    }

    interiorCenter(){
        return this.__iCenter.clone();
    }

    interiorDistance(){
        return this.__iDistance;
    }

    exteriorStart(){
        return this.__eStart.clone();
    }

    exteriorEnd(){
        return this.__eEnd.clone();
    }

    exteriorCenter(){
        return this.__eCenter.clone();
    }

    exteriorDistance(){
        return this.__eDistance;
    }

    /** Get the corners of the half edge.
     * @returns {Corner[]} An array of x,y pairs.
     */
    corners() {
        return [this.interiorStart(), this.interiorEnd(), this.exteriorEnd(), this.exteriorStart()];
    }

    interiorPointByEdges(v1, v2, debug = false) {
        if (!v1 || !v2) {
            // throw new Error('Need a valid next or previous edge');            
            // console.warn('Need a valid next or previous edge');
            return this.halfAngleVector(v1, v2);//.multiplyScalar(2.0);
        }

        let u = null,
            v = null,
            w = null,
            u3 = null,
            v3 = null,
            w3 = null,
            axis3 = null;
        let dot = 0;

        // let v2Thickness = v2.wall.thickness;
        // let v1Thickness = v1.wall.thickness;

        let v2Thickness = (v2.wall.frontEdge && v2.wall.backEdge) ? v2.wall.thickness * 0.5 : v2.wall.thickness;
        let v1Thickness = (v1.wall.frontEdge && v1.wall.backEdge) ? v1.wall.thickness * 0.5 : v1.wall.thickness;

        u = v1.getEnd().location.clone().sub(v1.getStart().location).normalize();
        v = v2.getEnd().location.clone().sub(v2.getStart().location).normalize();

        let dot_temp = u.dot(v);

        u = u.multiplyScalar(v2Thickness);
        v = v.multiplyScalar(v1Thickness);
        // w = u.clone().add(v);

        
        /**
         * When two walls are connected with 180 degrees apart, then simply
         * rotate the vector by 90 degrees clockwise and use it as the interiorPoint
         */
        if(dot_temp == 1.0){
            return u.clone().normalize().rotateAround(new Vector2(), 1.57).multiplyScalar(this.wall.thickness);
        }
        // let angle = Math.acos(dot_temp);
        // if(this == v1){
        //     return u.clone().rotateAround(new Vector2(), (angle+Math.PI)*0.5).normalize().multiplyScalar(this.wall.thickness);
        // }
        // return v.clone().rotateAround(new Vector2(), angle*0.5).normalize().multiplyScalar(this.wall.thickness);
        
        u3 = new Vector3(u.x, u.y, 0.0);
        v3 = new Vector3(v.x, v.y, 0.0);
        // w3 = new Vector3(w.x, w.y, 0.0);
        axis3 = u3.clone().normalize().cross(v3.clone().normalize());

        if (axis3.z < 0) {
            v = v.negate();//.multiplyScalar(-1);            
        }
        else {
            u = u.negate();//.multiplyScalar(-1);
        }

        u3.x = u.x;
        u3.y = u.y;
        v3.x = v.x;
        v3.y = v.y;

        dot = u.clone().normalize().dot(v.clone().normalize());

        if (dot < -0.1) {
            let uvAngle = Math.acos(dot);
            let offsetTheta = uvAngle - (Math.PI * 0.5);
            let v_temp = v.clone();
            if (dot < (1e-6 - 1.0)) {           
                v3.x -= 1e-2;
                v3.y -= 1e-2;
                v.x = v3.x;
                v.y = v3.y;
                axis3 = v3.clone().normalize().cross(u3.clone().normalize()).negate().normalize();
            }
            v3 = v3.clone().applyAxisAngle(axis3.clone().normalize(), offsetTheta);
            v.x = v3.x;
            v.y = v3.y;
            if (debug) {
                console.log('AXIS OF ROTATION ::: ', axis3);
                console.log('U VECTOR ::: ', u);
                console.log('V BEFORE ::: ', v_temp);
                console.log('V AFTER ::: ', v);
                console.log('DOT PRODUCT ::: ', dot);
                console.log('ANGLE UV ::: ', (uvAngle * 180) / Math.PI);
                console.log('OFFSET THETA ::: ', (offsetTheta * 180) / Math.PI);
            }
        }

        w = u.clone().add(v);
        // dot = u.clone().normalize().dot(v.clone().normalize());
        // let abs_dot = -dot;//Equivalent to 180 - degrees(math.cos(dot))
        // let abs_dot_acos = Math.acos(abs_dot);
        // // let magnitude = Math.sqrt((Math.pow(u.length(),2) + Math.pow(v.length(), 2)) + (2 * u.length() * v.length() * abs_dot));
        // let magnitude = ((u.length() ** 2 + v.length() ** 2) + (2 * u.length() * v.length() * abs_dot)) ** 0.5;
        // let theta = Math.asin((v.length() * Math.sin(abs_dot_acos)) / magnitude);
        // w = (u.clone().rotateAround(new Vector2(), -theta)).normalize().multiplyScalar(magnitude);

        if (debug) {
            console.log('==============================================');
            console.log('F :: ', u);
            console.log('G :: ', v);
            console.log('F FORCE :: ', u.length());
            console.log('G FORCE :: ', v.length());
            console.log('DOT PRODUCT VALUE  :: ', dot);
            console.log('ANGLE BETWEEN F AND G  :: ', (Math.acos(dot) * 180.0) / Math.PI);
            console.log('VECTOR ADDITION W LENGTH :: ', w.length());
            console.log('----------------------------------------------');
        }

        return w;
    }

    /**
         * This is the resultant of two forces at obtuse angles (angle > 90)
         * So implement the cosine law for the actual vector calculation;
    */
    interiorPointByEdges_V2(v1, v2, debug = false) {
        if (!v1 || !v2) {
            // throw new Error('Need a valid next or previous edge');            
            // console.warn('Need a valid next or previous edge');
            return this.halfAngleVector(v1, v2).multiplyScalar(2.0);
        }

        let f = null,
            g = null,
            o_f = null,
            o_g = null,
            w = null,
            f3 = null,
            g3 = null,
            axis3 = null;
        let dot = 0, abs_dot = 0.0, dot_acos = 0.0, abs_dot_acos = 0.0, magnitude = 0.0, theta = 0.0;

        f = v1.getEnd().location.clone().sub(v1.getStart().location).normalize();
        g = v2.getEnd().location.clone().sub(v2.getStart().location).normalize();
        o_f = f.clone();
        o_g = g.clone();

        dot = f.dot(g);
        abs_dot = -dot;//Equivalent to 180 - degrees(math.cos(dot))

        if (dot > (1.0 - 1e-6) || dot < (1e-6 - 1.0)) {
            w = f.clone().normalize().multiplyScalar(Math.min(v2.wall.thickness, v1.wall.thickness));
            w = w.rotateAround(new Vector2(0, 0), -Math.PI * 0.5);
            if (debug) {
                console.log('DOT PRODUCT TRIGGER ', dot);
            }
            return w;
        }

        f3 = new Vector3(f.x, f.y, 0.0);
        g3 = new Vector3(g.x, g.y, 0.0);
        axis3 = f3.clone().cross(g3);

        // if(axis3.z < 0){
        //     f = f.negate();//.multiplyScalar(-1);
        // }
        // else{
        //     g = g.negate();//.multiplyScalar(-1);
        // }

        f = f.multiplyScalar(v2.wall.thickness);
        g = g.multiplyScalar(v1.wall.thickness);
        o_f = o_f.multiplyScalar(v2.wall.thickness);
        o_g = o_g.multiplyScalar(v1.wall.thickness);


        dot_acos = Math.acos(dot);
        abs_dot_acos = Math.acos(abs_dot);
        // magnitude = Math.sqrt((Math.pow(f.length(),2) + Math.pow(g.length(), 2)) + (2 * f.length() * g.length() * abs_dot));
        magnitude = ((f.length() ** 2 + g.length() ** 2) + (2 * f.length() * g.length() * abs_dot)) ** 0.5;
        theta = Math.asin((g.length() * Math.sin(abs_dot_acos)) / magnitude);
        w = (f.clone().rotateAround(new Vector2(), -theta)).normalize().multiplyScalar(magnitude);

        if (debug) {
            let w3 = f3.clone().add(g3);
            let angle3 = w3.angleTo(f3);
            console.log('==============================================');
            console.log('F :: ', f);
            console.log('G :: ', g);
            console.log('F FORCE :: ', f.length());
            console.log('G FORCE :: ', g.length());
            console.log('DOT PRODUCT VALUE  :: ', dot);
            console.log('ABS DOT PRODUCT VALUE  :: ', abs_dot);
            console.log('ANGLE ::: ', (angle3 * 180.0) / Math.PI);
            console.log('ANGLE3 (sum f + g) ', (theta * 180.0) / Math.PI);
            console.log('CROSS AXIS :: ', axis3);
            console.log('MAGNITUDE VALUE : ', magnitude);
            console.log('VECTOR ADDITION W LENGTH :: ', w.length());
            console.log('----------------------------------------------');
        }
        return w;
    }

    /**
     * 
     * @param {HalfEdge} v1 
     * @param {HalfEdge} v2 
     * @description Get the point inside the room for interior ends Calculation
     * @returns {Vector2}
     */

    interiorPointByEdgesOLD(v1, v2) {
        let directionSelf = null,
            directionOther = null;
        if (!v1 || !v2) {
            if (!v1) {
                directionSelf = this.getEnd().location.clone().sub(this.getStart().location).normalize();
                directionSelf = directionSelf.multiplyScalar(this.wall.thickness);
                directionSelf = directionSelf.rotateAround(new Vector2(), -0.785398); //Rotate by 45 degrees CW
            } else if (!v2) {
                directionSelf = this.getStart().location.clone().sub(this.getEnd().location).normalize();
                directionSelf = directionSelf.multiplyScalar(this.wall.thickness);
                directionSelf = directionSelf.rotateAround(new Vector2(), 0.785398); //Rotate by 45 degrees CW
            }
            return directionSelf;
        }

        let d1 = null,
            d2 = null;
        let dot = 0;

        d1 = v1.getEnd().location.clone().sub(v1.getStart().location).normalize();
        d2 = v2.getStart().location.clone().sub(v2.getEnd().location).normalize();
        dot = d1.dot(d2);

        if (dot > 1.0 - 1e-6 || dot < 1e-6 - 1.0) {
            let maxThickness = Math.max(v1.wall.thickness, v2.wall.thickness);
            d1 = d1.multiplyScalar(maxThickness);
            d2 = d2.multiplyScalar(maxThickness);
        } else {

            d1 = d1.multiplyScalar(v2.wall.thickness);
            d2 = d2.multiplyScalar(v1.wall.thickness);
        }
        return d1.add(d2);

        // directionSelf = v2.getEnd().location.clone().sub(v2.getStart().location).normalize();
        // directionOther = v1.getStart().location.clone().sub(v1.getEnd().location).normalize();

        // directionOther = directionOther.multiplyScalar(v2.wall.thickness);
        // directionSelf = directionSelf.multiplyScalar(v1.wall.thickness);
        // return directionSelf.add(directionOther);
    }

    /**
     * 
     * @param {HalfEdge} v1 
     * @param {HalfEdge} v2 
     * @description Get the point inside the room for interior ends Calculation
     * @returns {Vector2}
     */

    interiorPoint(nextOrPrev, isFromStart = true) {
        let directionOther = null,
            directionSelf = null;
        if (!nextOrPrev) {
            if (isFromStart) {
                directionSelf = this.getEnd().location.clone().sub(this.getStart().location).normalize();
                directionSelf = directionSelf.multiplyScalar(this.wall.thickness);
                directionSelf = directionSelf.rotateAround(new Vector2(), -0.785398); //Rotate by 45 degrees CW
            } else {
                directionSelf = this.getStart().location.clone().sub(this.getEnd().location).normalize();
                directionSelf = directionSelf.multiplyScalar(this.wall.thickness);
                directionSelf = directionSelf.rotateAround(new Vector2(), 0.785398); //Rotate by 45 degrees CW
            }
            return directionSelf;
        }
        if (isFromStart) {
            directionSelf = this.getEnd().location.clone().sub(this.getStart().location).normalize();
            // Two connected edges have their end corners that will be either start or end in one, 
            // and vice-versa for the other one
            directionOther = nextOrPrev.getStart().location.clone().sub(nextOrPrev.getEnd().location).normalize();
        } else {
            directionSelf = this.getStart().location.clone().sub(this.getEnd().location).normalize();
            // Two connected edges have their end corners that will be either start or end in one, 
            // and vice-versa for the other one
            directionOther = nextOrPrev.getEnd().location.clone().sub(nextOrPrev.getStart().location).normalize();
        }

        directionOther = directionOther.multiplyScalar(this.wall.thickness);
        directionSelf = directionSelf.multiplyScalar(nextOrPrev.wall.thickness);
        return directionSelf.add(directionOther);
    }

    /**
     * Gets CCW angle from v1 to v2
     * @param {Vector2} v1 The point a
     * @param {Vector2} v1 The point b
     * @return {Object} contains keys x and y with number representing the halfAngles
     */
    halfAngleVector(v1, v2) {
        let v1startX = 0.0,
            v1startY = 0.0,
            v1endX = 0.0,
            v1endY = 0.0;
        let v2startX = 0.0,
            v2startY = 0.0,
            v2endX = 0.0,
            v2endY = 0.0;

        // make the best of things if we dont have prev or next
        if (!v1) {
            v1startX = v2.getStart().x - (v2.getEnd().x - v2.getStart().x);
            v1startY = v2.getStart().y - (v2.getEnd().y - v2.getStart().y);

            v1endX = v2.getStart().x;
            v1endY = v2.getStart().y;
        } else {
            v1startX = v1.getStart().x;
            v1startY = v1.getStart().y;
            v1endX = v1.getEnd().x;
            v1endY = v1.getEnd().y;
        }

        if (!v2) {
            v2startX = v1.getEnd().x;
            v2startY = v1.getEnd().y;
            v2endX = v1.getEnd().x + (v1.getEnd().x - v1.getStart().x);
            v2endY = v1.getEnd().y + (v1.getEnd().y - v1.getStart().y);
        } else {
            v2startX = v2.getStart().x;
            v2startY = v2.getStart().y;
            v2endX = v2.getEnd().x;
            v2endY = v2.getEnd().y;
        }

        // CCW angle between edges
        let theta = Utils.angle2pi(new Vector2(v1startX - v1endX, v1startY - v1endY), new Vector2(v2endX - v1endX, v2endY - v1endY));

        // cosine and sine of half angle
        let cs = Math.cos(theta / 2.0);
        let sn = Math.sin(theta / 2.0);

        // rotate v2
        let v2dx = v2endX - v2startX;
        let v2dy = v2endY - v2startY;

        let vx = v2dx * cs - v2dy * sn;
        let vy = v2dx * sn + v2dy * cs;

        // normalize
        let mag = Utils.distance(new Vector2(0, 0), new Vector2(vx, vy));
        let desiredMag = (this.wall.thickness * 0.5) / sn;
        let scalar = desiredMag / mag;

        let halfAngleVector = new Vector2(vx * scalar, vy * scalar); //{ x: vx * scalar, y: vy * scalar }; //

        return halfAngleVector;
    }


    setTextureMaps(texturePack) {
        if (!texturePack.color) {
            texturePack.color = '#FFFFFF';
        }
        if (!texturePack.repeat) {
            texturePack.repeat = TEXTURE_DEFAULT_REPEAT; //For every TEXTURE_DEFAULT_REPEAT cms
        }

        if (this.front) {
            this.wall.frontTexture = texturePack;
        } else {
            this.wall.backTexture = texturePack;
        }
        this.dispatchEvent({ type: EVENT_UPDATE_TEXTURES, item: this });
    }

    setTextureMapAttribute(attribute, value) {
        if (attribute && value) {
            let texturePack = this.getTexture();
            texturePack[attribute] = value;
            this.dispatchEvent({ type: EVENT_MODIFY_TEXTURE_ATTRIBUTE, item: this, attribute: attribute, value: value });
        }
    }

    /**
     * Two separate textures are used for the walls. Based on which side of the wall this {HalfEdge} refers the texture is returned
     * @return {Object} front/back Two separate textures are used for the walls. Based on which side of the wall this {@link HalfEdge} refers the texture is returned
     */
    getTexture() {
        if (this.front) {
            return this.wall.frontTexture;
        } else {
            return this.wall.backTexture;
        }
    }

    /**
     * Set a Texture to the wall. Based on the edge side as front or back the texture is applied appropriately to the wall
     * @deprecated
     * @param {String} textureUrl The path to the texture image
     * @param {boolean} textureStretch Can the texture stretch? If not it will be repeated
     * @param {Number} textureScale The scale value using which the number of repetitions of the texture image is calculated
     * @emits {EVENT_REDRAW}
     */
    setTexture(textureUrl, textureStretch, textureScale) {
        let texture = { url: textureUrl, stretch: textureStretch, scale: textureScale };
        if (this.front) {
            this.wall.frontTexture = texture;
        } else {
            this.wall.backTexture = texture;
        }

        //this.redrawCallbacks.fire();
        this.dispatchEvent({ type: EVENT_REDRAW, item: this });
    }

    /**
     * Emit the redraw event
     * @emits {EVENT_REDRAW}
     */
    dispatchRedrawEvent() {
        this.dispatchEvent({ type: EVENT_REDRAW, item: this });
    }

    /**
     * Transform the {@link Corner} instance to a Vector3 instance using the x and y position returned as x and z
     * @param {Corner} corner
     * @return {Vector3}
     * @see https://threejs.org/docs/#api/en/math/Vector3
     */
    transformCorner(corner) {
        return new Vector3(corner.x, 0, corner.y);
    }

    generatePlane() {
        this.__plane = this.__generateEdgePlane(true, this.__plane);
        // this.__exteriorPlane = this.__plane;
        // if (this.wall.start.getAttachedRooms().length < 2 || this.wall.end.getAttachedRooms().length < 2) {
        //     this.__exteriorPlane = this.__generateEdgePlane(false, this.__exteriorPlane);
        // }
        // else{
        //     this.__exteriorPlane = null;
        // }
    }

    destroy() {
        this.__plane = null;
        // this.wall = null;
        this.__isOrphan = true;
        this.wall.removeEventListener(EVENT_MOVED, this.__wallMovedEvent);
        this.wall.removeEventListener(EVENT_UPDATED, this.__wallUpdatedEvent);
        this.dispatchEvent({ type: EVENT_DELETED, edge: this });
    }

    get vertices() {
        return this.__vertices;
    }

    get normal() {
        return this.__normal;
    }

    get isOrphan() {
        return this.__isOrphan;
    }

    get plane() {
        return this.__plane;
    }

    get exteriorPlane() {
        return this.__exteriorPlane;
    }

    get prev(){
        return this.__prev;
    }

    set prev(halfEdge){
        this.__prev = halfEdge;
        this.__updateInteriorsExteriors();
    }

    get next(){
        return this.__next;
    }

    set next(halfEdge){
        this.__next = halfEdge;
        this.__updateInteriorsExteriors();
    }

}

export default HalfEdge;