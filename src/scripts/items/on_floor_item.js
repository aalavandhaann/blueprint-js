import {FloorItem} from './floor_item.js';
/// <reference path="../../lib/three.d.ts" />
/// <reference path="../model/model.ts" />
/// <reference path="floor_item.ts" />
/// <reference path="metadata.ts" />

/** */
export class OnFloorItem extends FloorItem 
{
	constructor(model, metadata, geometry, material, position, rotation, scale) 
	{
		super(model, metadata, geometry, material, position, rotation, scale);
		this.obstructFloorMoves = false;
		this.receiveShadow = true;
	}
}