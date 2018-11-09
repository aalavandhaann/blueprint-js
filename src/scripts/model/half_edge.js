import {EventDispatcher, Vector2, Vector3, Matrix4, Face3, Mesh, Geometry, MeshBasicMaterial, Box3} from 'three';
import {EVENT_REDRAW} from '../core/events.js';
import {Utils} from '../core/utils.js';


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
	 * @param room The associated room. Instance of Room
	 * @param wall The corresponding wall. Instance of Wall
	 * @param front True if front side. Boolean value
	 */
	constructor(room, wall, front)
	{
		super();
		
		this.min = null;
		this.max = null;
		this.center = null;
		
		this.room = room;
		this.wall = wall;
		this.next = null;
		this.prev = null;
		this.offset = 0.0;
		this.height = 0.0;
		this.plane = null;
		this.interiorTransform = new Matrix4();
		this.invInteriorTransform = new Matrix4();
		this.exteriorTransform = new Matrix4();
		this.invExteriorTransform = new Matrix4();
		this.redrawCallbacks = null;

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
	 * 
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
	 * 
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
	
	dispatchRedrawEvent()
	{
		this.dispatchEvent({type:EVENT_REDRAW, item: this});
	}

	transformCorner(corner)
	{
		return new Vector3(corner.x, 0, corner.y);
	}


	/** 
	 * this feels hacky, but need wall items
	 */
	generatePlane()
	{
		var geometry = new Geometry();
		var v1 = this.transformCorner(this.interiorStart());
		var v2 = this.transformCorner(this.interiorEnd());
		var v3 = v2.clone();
		var v4 = v1.clone();
		v3.y = this.wall.height;
		v4.y = this.wall.height;

		geometry.vertices = [v1, v2, v3, v4];
		geometry.faces.push(new Face3(0, 1, 2));
		geometry.faces.push(new Face3(0, 2, 3));
		geometry.computeFaceNormals();
		geometry.computeBoundingBox();
		
 
		this.plane = new Mesh(geometry, new MeshBasicMaterial({visible:false}));
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

	interiorDistance() 
	{
		var start = this.interiorStart();
		var end = this.interiorEnd();
		return Utils.distance(start, end);
	}

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
	 * @param x X coordinate of the point.
	 * @param y Y coordinate of the point.
	 * @returns The distance.
	 */
	distanceTo(x, y)
	{
		// x, y, x1, y1, x2, y2
		return Utils.pointDistanceFromLine(new Vector2(x, y), this.interiorStart(), this.interiorEnd());
	}

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

	// these return an object with attributes x, y
	interiorEnd()
	{
		var vec = this.halfAngleVector(this, this.next);
//		return new Vector2(this.getEnd().x + vec.x, this.getEnd().y + vec.y);
		return {x:this.getEnd().x + vec.x, y:this.getEnd().y + vec.y};
	}

	interiorStart() 
	{
		var vec = this.halfAngleVector(this.prev, this);
//		return new Vector2(this.getStart().x + vec.x, this.getStart().y + vec.y);
		return {x:this.getStart().x + vec.x, y:this.getStart().y + vec.y};
	}

	interiorCenter() 
	{
		return new Vector2((this.interiorStart().x + this.interiorEnd().x) / 2.0, (this.interiorStart().y + this.interiorEnd().y) / 2.0);
	}

	exteriorEnd()  
	{
		var vec = this.halfAngleVector(this, this.next);
		return new Vector2(this.getEnd().x - vec.x, this.getEnd().y - vec.y);
	}

	exteriorStart()  
	{
		var vec = this.halfAngleVector(this.prev, this);
		return new Vector2(this.getStart().x - vec.x, this.getStart().y - vec.y);
	}

	/** Get the corners of the half edge.
	 * @returns An array of x,y pairs.
	 */
	corners() 
	{
		return [this.interiorStart(), this.interiorEnd(), this.exteriorEnd(), this.exteriorStart()];
	}

	/** 
	 * Gets CCW angle from v1 to v2
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