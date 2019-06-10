import {Item} from './item.js';
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
	}

	/** Returns an array of planes to use other than the ground plane
	 * for passing intersection to clickPressed and clickDragged */
	customIntersectionPlanes()
	{
		return this.model.floorplan.roofPlanes();
	}
}
