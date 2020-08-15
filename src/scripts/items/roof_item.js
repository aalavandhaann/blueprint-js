import { Item } from './item.js';
import { Matrix4, Triangle, Plane, Vector3 } from 'three';
/**
 * A Floor Item is an entity to be placed related to a floor.
 */
export class RoofItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
    }
}