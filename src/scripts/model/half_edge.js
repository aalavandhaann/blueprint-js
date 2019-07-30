import {EventDispatcher, Vector2, Vector3, Matrix4, Face3, Mesh, Geometry, MeshBasicMaterial, Box3} from 'three';
import {EVENT_REDRAW} from '../core/events.js';
import {Utils} from '../core/utils.js';
import {WallTypes} from '../core/constants.js';

/**
 * Half Edges are created by Room.
 *
 * Once rooms have been identified, Half Edges are created for each interior wall.
 *
 * A wall can have two half edges if it is visible from both sides.
 */
export class HalfEdge extends EventDispatcher
{
	/**
	 * Constructs a half edge.
	 * @param {Room} room The associated room. Instance of Room
	 * @param {Wall} wall The corresponding wall. Instance of Wall
	 * @param {boolean} front True if front side. Boolean value
	 */
	constructor(room, wall, front)
	{
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
		this.room = room;
		
		/** 
		 *  Reference to a Wall instance
		 * @property {Wall} room Reference to a Wall instance
		 * @type {Wall}
		**/
		this.wall = wall;
		
		/**
		 * Reference to the next halfedge instance connected to this
		 * @property {HalfEdge} next Reference to the next halfedge instance connected to this
		 * @type {HalfEdge}
		**/
		this.next = null;
		
		/**
		 * Reference to the previous halfedge instance connected to this
		 * @property {HalfEdge} prev Reference to the previous halfedge instance connected to this
		 * @type {HalfEdge}
		**/
		this.prev = null;
		
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
		this.plane = null;
		
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
		 * Is this is the front edge or the back edge
		 * @property {boolean} front Is this is the front edge or the back edge
		 * @type {boolean}
		 */
		this.front = front || false;
		
		this.offset = wall.thickness / 2.0;
		this.height = wall.height;

		if (this.front)
		{
			this.wall.frontEdge = this;
		}
		else
		{
			this.wall.backEdge = this;
		}

	}

	/**
	 * Two separate textures are used for the walls. Based on which side of the wall this {HalfEdge} refers the texture is returned
	 * @return {Object} front/back Two separate textures are used for the walls. Based on which side of the wall this {@link HalfEdge} refers the texture is returned
	 */
	getTexture()
	{
		if (this.front)
		{
			return this.wall.frontTexture;
		}
		else
		{
			return this.wall.backTexture;
		}
	}

	/**
	 * Set a Texture to the wall. Based on the edge side as front or back the texture is applied appropriately to the wall
	 * @param {String} textureUrl The path to the texture image
	 * @param {boolean} textureStretch Can the texture stretch? If not it will be repeated
	 * @param {Number} textureScale The scale value using which the number of repetitions of the texture image is calculated
	 * @emits {EVENT_REDRAW}
	 */
	setTexture(textureUrl, textureStretch, textureScale)
	{
		var texture = {url: textureUrl, stretch: textureStretch, scale: textureScale};
		if (this.front)
		{
			this.wall.frontTexture = texture;
		}
		else
		{
			this.wall.backTexture = texture;
		}

		//this.redrawCallbacks.fire();
		this.dispatchEvent({type:EVENT_REDRAW, item: this});
	}
	
	/**
	 * Emit the redraw event
	 * @emits {EVENT_REDRAW}
	 */
	dispatchRedrawEvent()
	{
		this.dispatchEvent({type:EVENT_REDRAW, item: this});
	}
	
	/**
	 * Transform the {@link Corner} instance to a Vector3 instance using the x and y position returned as x and z
	 * @param {Corner} corner
	 * @return {Vector3}
	 * @see https://threejs.org/docs/#api/en/math/Vector3
	 */
	transformCorner(corner)
	{
		return new Vector3(corner.x, 0, corner.y);
	}


	/**
	 * This generates the invisible planes in the scene that are used for interesection testing for the wall items
	 */
	generatePlane()
	{
		var geometry = new Geometry();
		var v1 = this.transformCorner(this.interiorStart());
		var v2 = this.transformCorner(this.interiorEnd());
		var v3 = v2.clone();
		var v4 = v1.clone();

		// v3.y = this.wall.height;
		// v4.y = this.wall.height;

		v3.y = this.wall.startElevation;
		v4.y = this.wall.endElevation;

		geometry.vertices = [v1, v2, v3, v4];
		geometry.faces.push(new Face3(0, 1, 2));
		geometry.faces.push(new Face3(0, 2, 3));
		geometry.computeFaceNormals();
		geometry.computeBoundingBox();


		this.plane = new Mesh(geometry, new MeshBasicMaterial({visible:true}));
		//The below line was originally setting the plane visibility to false
		//Now its setting visibility to true. This is necessary to be detected
		//with the raycaster objects to click walls and floors.
		this.plane.visible = true;
		this.plane.edge = this; // js monkey patch


		this.computeTransforms(this.interiorTransform, this.invInteriorTransform, this.interiorStart(), this.interiorEnd());
		this.computeTransforms(this.exteriorTransform, this.invExteriorTransform, this.exteriorStart(), this.exteriorEnd());

		var b3 = new Box3();
		b3.setFromObject(this.plane);
		this.min = b3.min.clone();
		this.max = b3.max.clone();
		this.center = this.max.clone().sub(this.min).multiplyScalar(0.5).add(this.min);
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
	computeTransforms(transform, invTransform, start, end)
	{
		var v1 = start;
		var v2 = end;

		var angle = Utils.angle(new Vector2(1, 0), new Vector2(v2.x - v1.x, v2.y - v1.y));

		var tt = new Matrix4();
		var tr = new Matrix4();

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
	distanceTo(x, y)
	{
		if(this.wall.wallType == WallTypes.STRAIGHT)
		{
			// x, y, x1, y1, x2, y2
			return Utils.pointDistanceFromLine(new Vector2(x, y), this.interiorStart(), this.interiorEnd());
		}
		else if (this.wall.wallType == WallTypes.CURVED)
		{
			var p = this._bezier.project({x:x, y:y});
			var projected = new Vector2(p.x, p.y);
			return projected.distanceTo(new Vector2(x, y));
		}
		return -1;
	}
	
	/**
	 * Get the starting corner of the wall this instance represents
	 * @return {Corner} The starting corner
	 */
	getStart()
	{
		if (this.front)
		{
			return this.wall.getStart();
		}
		else
		{
			return this.wall.getEnd();
		}
	}
	
	/**
	 * Get the ending corner of the wall this instance represents
	 * @return {Corner} The ending corner
	 */
	getEnd()
	{
		if (this.front)
		{
			return this.wall.getEnd();
		}
		else
		{
			return this.wall.getStart();
		}
	}	
	
	/**
	 * If this is the front edge then return the back edge. 
	 * For example in a wall there are two halfedges, i.e one for front and one back. Based on which side this halfedge lies return the opposite {@link HalfEdge}
	 * @return {HalfEdge} The other HalfEdge
	 */
	getOppositeEdge()
	{
		if (this.front)
		{
			return this.wall.backEdge;
		}
		else
		{
			return this.wall.frontEdge;
		}
	}
	
	/**
	 * Return the 2D interior location that is at the center/middle. 
	 * @return {Vector2} Return an object with attributes x, y
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	interiorCenter()
	{
		if(this.wall.wallType == WallTypes.STRAIGHT)
		{
			// x, y, x1, y1, x2, y2
			return new Vector2((this.interiorStart().x + this.interiorEnd().x) / 2.0, (this.interiorStart().y + this.interiorEnd().y) / 2.0);
		}
		else if (this.wall.wallType == WallTypes.CURVED)
		{
			var c = this.wall.bezier.get(0.5);
			return new Vector2(c.x, c.y);
		}
		return new Vector2((this.interiorStart().x + this.interiorEnd().x) / 2.0, (this.interiorStart().y + this.interiorEnd().y) / 2.0);
	}
	
	/**
	 * Return the interior distance of the interior wall 
	 * @return {Number} The distance
	 */
	interiorDistance()
	{
		var start = this.interiorStart();
		var end = this.interiorEnd();
		if(this.wall.wallType == WallTypes.STRAIGHT)
		{
			return Utils.distance(start, end);
		}
		else if (this.wall.wallType == WallTypes.CURVED)
		{
			return this.wall.bezier.length();
		}		
		return Utils.distance(start, end);
	}
	
	/**
	 * Return the 2D interior location that is at the start. 
	 * @return {Vector2} Return an object with attributes x, y
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	interiorStart()
	{
		var vec = this.halfAngleVector(this.prev, this);
		return new Vector2(this.getStart().x + vec.x, this.getStart().y + vec.y);
		// return {x:this.getStart().x + vec.x, y:this.getStart().y + vec.y};
	}
	
	/**
	 * Return the 2D interior location that is at the end. 
	 * @return {Vector2} Return an object with attributes x, y
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	// 
	interiorEnd()
	{
		var vec = this.halfAngleVector(this, this.next);
		return new Vector2(this.getEnd().x + vec.x, this.getEnd().y + vec.y);
		// return {x:this.getEnd().x + vec.x, y:this.getEnd().y + vec.y};
	}
	
	/**
	 * Return the 2D exterior location that is at the end. 
	 * @return {Vector2} Return an object with attributes x, y
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	exteriorEnd()
	{
		var vec = this.halfAngleVector(this, this.next);
		return new Vector2(this.getEnd().x - vec.x, this.getEnd().y - vec.y);
	}
	
	/**
	 * Return the 2D exterior location that is at the start. 
	 * @return {Vector2} Return an object with attributes x, y
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	exteriorStart()
	{
		var vec = this.halfAngleVector(this.prev, this);
		return new Vector2(this.getStart().x - vec.x, this.getStart().y - vec.y);
	}
	
	/**
	 * Return the 2D exterior location that is at the center/middle. 
	 * @return {Vector2} Return an object with attributes x, y
	 * @see https://threejs.org/docs/#api/en/math/Vector2
	 */
	exteriorCenter()
	{
		if(this.wall.wallType == WallTypes.STRAIGHT)
		{
			// x, y, x1, y1, x2, y2
			return new Vector2((this.exteriorStart().x + this.exteriorEnd().x) / 2.0, (this.exteriorStart().y + this.exteriorEnd().y) / 2.0);
		}
		else if (this.wall.wallType == WallTypes.CURVED)
		{
			var c = this.wall.bezier.get(0.5);
			return new Vector2(c.x, c.y);
		}
		return new Vector2((this.exteriorStart().x + this.exteriorEnd().x) / 2.0, (this.exteriorStart().y + this.exteriorEnd().y) / 2.0);
	}
	
	/**
	 * Return the exterior distance of the exterior wall 
	 * @return {Number} The distance
	 */
	exteriorDistance()
	{
		var start = this.exteriorStart();
		var end = this.exteriorEnd();
		if(this.wall.wallType == WallTypes.STRAIGHT)
		{
			return Utils.distance(start, end);
		}
		else if (this.wall.wallType == WallTypes.CURVED)
		{
			return this.wall.bezier.length();
		}		
		return Utils.distance(start, end);
	}

	/** Get the corners of the half edge.
	 * @returns {Corner[]} An array of x,y pairs.
	 */
	corners()
	{
		return [this.interiorStart(), this.interiorEnd(), this.exteriorEnd(), this.exteriorStart()];
	}	
	
//	curvedCorners()
//	{
//		if(this.wall)
//		{
//			var curves = [];
//			var o = new Vector2(0, 0);
//			var s = this.wall.start.location;
//			var e = this.wall.end.location;
//			
////			var avect = this.wall.a.clone().sub(this.wall.start);
////			var bvect = this.wall.b.clone().sub(this.wall.start);
//			
//			var sevect = s.clone().sub(e).normalize();
//			var se90plus = sevect.clone().rotateAround(o, 3.14*0.5).multiplyScalar(this.wall.thickness*0.5);
//			var se90minus = sevect.clone().rotateAround(o, -3.14*0.5).multiplyScalar(this.wall.thickness*0.5);
//			
//			var s1 = se90plus.clone().add(s);
//			var e1 = se90plus.clone().add(e);
//			var e2 = se90minus.clone().add(e);
//			var s2 = se90minus.clone().add(s);
//			
//			curves.push([s1]);
//			curves.push([this.wall.a.clone().add(se90plus), this.wall.b.clone().add(se90plus), e1]);
//			curves.push([e2]);
//			curves.push([this.wall.b.clone().add(se90minus), this.wall.a.clone().add(se90minus), s2]);
////			curves.push([s2]);
//			
//			
//			return curves;			
//		}
//		return [];
//	}

	/**
	 * Gets CCW angle from v1 to v2
	 * @param {Vector2} v1 The point a
	 * @param {Vector2} v1 The point b
	 * @return {Object} contains keys x and y with number representing the halfAngles
	 */
	halfAngleVector(v1, v2)
	{
		var v1startX=0.0, v1startY=0.0, v1endX=0.0, v1endY=0.0;
		var v2startX=0.0, v2startY=0.0, v2endX=0.0, v2endY=0.0;

		// make the best of things if we dont have prev or next
		if (!v1)
		{
			v1startX = v2.getStart().x - (v2.getEnd().x - v2.getStart().x);
			v1startY = v2.getStart().y - (v2.getEnd().y - v2.getStart().y);

			v1endX = v2.getStart().x;
			v1endY = v2.getStart().y;
		}
		else
		{
			v1startX = v1.getStart().x;
			v1startY = v1.getStart().y;
			v1endX = v1.getEnd().x;
			v1endY = v1.getEnd().y;
		}

		if (!v2)
		{
			v2startX = v1.getEnd().x;
			v2startY = v1.getEnd().y;
			v2endX = v1.getEnd().x + (v1.getEnd().x - v1.getStart().x);
			v2endY = v1.getEnd().y + (v1.getEnd().y - v1.getStart().y);
		}
		else
		{
			v2startX = v2.getStart().x;
			v2startY = v2.getStart().y;
			v2endX = v2.getEnd().x;
			v2endY = v2.getEnd().y;
		}

		// CCW angle between edges
		var theta = Utils.angle2pi( new Vector2(v1startX - v1endX, v1startY - v1endY), new Vector2(v2endX - v1endX, v2endY - v1endY));

		// cosine and sine of half angle
		var cs = Math.cos(theta / 2.0);
		var sn = Math.sin(theta / 2.0);

		// rotate v2
		var v2dx = v2endX - v2startX;
		var v2dy = v2endY - v2startY;

		var vx = v2dx * cs - v2dy * sn;
		var vy = v2dx * sn + v2dy * cs;

		// normalize
		var mag = Utils.distance(new Vector2(0, 0), new Vector2(vx, vy));
		var desiredMag = (this.offset) / sn;
		var scalar = desiredMag / mag;

		var halfAngleVector = {x:vx * scalar, y:vy * scalar};//new Vector2(vx * scalar, vy * scalar);
		return halfAngleVector;
	}
}
