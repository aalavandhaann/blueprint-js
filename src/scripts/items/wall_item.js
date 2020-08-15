import { Vector2, Vector3 } from 'three';
import { EVENT_DELETED } from '../core/events.js';
import { Utils } from '../core/utils.js';
import { Item } from './item.js';

/**
 * A Wall Item is an entity to be placed related to a wall.
 */
export class WallItem extends Item {
    constructor(model, metadata, id) {
        super(model, metadata, id);
        this.__boundToFloor = false;
        this.__allowRotate = false;
        this.__freePosition = false;
    }
}