/// <reference path="../../lib/three.d.ts" />
/// <reference path="../model/model.ts" />
/// <reference path="wall_item.ts" />
/// <reference path="metadata.ts" />
import {WallItem} from './wall_item.js';
/** */
export class InWallItem extends WallItem
{
	constructor(model, metadata, geometry, material, position, rotation, scale, isgltf=false)
	{
		super(model, metadata, geometry, material, position, rotation, scale, isgltf);
		this.addToWall = true;
	}

	/** */
	getWallOffset()
	{
		// fudge factor so it saves to the right wall
		return -this.currentWallEdge.offset + 0.5;
	}
}
