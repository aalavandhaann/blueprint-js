import {Vector2} from 'three';
import {Item} from './item.js';
import {Utils} from '../core/utils.js';

/**
 * A Floor Item is an entity to be placed related to a floor.
 */
export class FloorItem extends Item
{
	constructor(model, metadata, geometry, material, position, rotation, scale, isgltf=false)
	{
		super(model, metadata, geometry, material, position, rotation, scale, isgltf);
		this._freePosition = false;
	}

	/** */
	placeInRoom()
	{
		if (!this.position_set)
		{
			var center = this.model.floorplan.getCenter();
			this.position.x = center.x;
			this.position.z = center.z;
			this.position.y = 0.5 * (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y);
		}
	}

	/** Take action after a resize */
	resized()
	{
		this.position.y = this.halfSize.y;
	}

	/** */
	moveToPosition(vec3)
	{
		// keeps the position in the room and on the floor
		if (!this.isValidPosition(vec3))
		{
			this.showError(vec3);
			return;
		}
		else
		{
			this.hideError();
			vec3.y = this.position.y; // keep it on the floor!
//			this.position.copy(vec3);
			super.moveToPosition(vec3);
		}
	}

	/** */
	isValidPosition(vec3)
	{
		var corners = this.getCorners('x', 'z', vec3);
		// check if we are in a room
		var rooms = this.model.floorplan.getRooms();
		var isInARoom = false;
		for (var i = 0; i < rooms.length; i++)
		{
			if (Utils.pointInPolygon(new Vector2(vec3.x, vec3.z), rooms[i].interiorCorners) && !Utils.polygonPolygonIntersect(corners, rooms[i].interiorCorners))
			{
				isInARoom = true;
			}
		}
		if (!isInARoom)
		{
			//We do not want to check if the object is in room or not
			//It is upto the user to place it anywhere he/she wants however
//			return false;
			return true;
		}

		// check if we are outside all other objects
		/*
      if (this.obstructFloorMoves) {
          var objects = this.model.items.getItems();
          for (var i = 0; i < objects.length; i++) {
              if (objects[i] === this || !objects[i].obstructFloorMoves) {
                  continue;
              }
              if (!utils.polygonOutsidePolygon(corners, objects[i].getCorners('x', 'z')) ||
                  utils.polygonPolygonIntersect(corners, objects[i].getCorners('x', 'z'))) {
                  //console.log('object not outside other objects');
                  return false;
              }
          }
      }*/
		return true;
	}
}
