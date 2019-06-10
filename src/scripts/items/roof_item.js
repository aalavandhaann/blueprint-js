import {Item} from './item.js';
import {Matrix4} from 'three';
/**
 * A Floor Item is an entity to be placed related to a floor.
 */
export class RoofItem extends Item
{
	constructor(model, metadata, geometry, material, position, rotation, scale, isgltf=false)
	{
		super(model, metadata, geometry, material, position, rotation, scale, isgltf);
		this.allowRotate = false;
		this.boundToFloor = false;
		if(this.geometry)
		{
				this.geometry.applyMatrix(new Matrix4().makeTranslation(-0.5 * (this.geometry.boundingBox.max.x + this.geometry.boundingBox.min.x), -0.5 * (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y),-0.5 * (this.geometry.boundingBox.max.z + this.geometry.boundingBox.min.z)));
				this.geometry.computeBoundingBox();
		}
		this.halfSize = this.objectHalfSize();
		this.canvasPlaneWH.position.set(0, this.getHeight() * -0.5, this.getDepth()*0.5);
		this.canvasPlaneWD.position.set(0, -this.getHeight(), 0);

		this.remove(this.canvasPlaneWH);
		this.remove(this.canvasPlaneWD);
	}

	/** Returns an array of planes to use other than the ground plane
	 * for passing intersection to clickPressed and clickDragged */
	customIntersectionPlanes()
	{
		return this.model.floorplan.roofPlanes();
	}
}
