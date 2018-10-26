import {EVENT_LOADED, EVENT_LOADING} from '../core/events.js';
import {EventDispatcher, Vector3} from 'three';
import {Floorplans} from './floorplan.js';
import {Scene} from './scene.js';

/** 
 * A Model connects a Floorplan and a Scene. 
 */
export class Model extends EventDispatcher
{
	/** Constructs a new model.
	 * @param textureDir The directory containing the textures.
	 */
	constructor(textureDir) 
	{
		super();
		this.floorplan = new Floorplans();
		this.scene = new Scene(this, textureDir);
		this.roomLoadingCallbacks = null;
		this.roomLoadedCallbacks = null;
		this.roomSavedCallbacks = null;
		this.roomDeletedCallbacks = null;

	}

	loadSerialized(json) 
	{
		// TODO: better documentation on serialization format.
		// TODO: a much better serialization format.
		this.dispatchEvent({type: EVENT_LOADING, item: this});
		//      this.roomLoadingCallbacks.fire();

		var data = JSON.parse(json);
		this.newRoom(data.floorplan,data.items);

		this.dispatchEvent({type: EVENT_LOADED, item: this});
		//      this.roomLoadedCallbacks.fire();
	}

	exportSerialized() 
	{
		var items_arr = [];
		var objects = this.scene.getItems();
		for (var i = 0; i < objects.length; i++) 
		{
			var obj = objects[i];
			items_arr[i] = {item_name: obj.metadata.itemName,item_type: obj.metadata.itemType,model_url: obj.metadata.modelUrl,xpos: obj.position.x,ypos: obj.position.y,zpos: obj.position.z,rotation: obj.rotation.y,scale_x: obj.scale.x,scale_y: obj.scale.y,scale_z: obj.scale.z,fixed: obj.fixed};
		}

		var room = {floorplan: (this.floorplan.saveFloorplan()),items: items_arr};
		return JSON.stringify(room);
	}

	newRoom(floorplan, items) 
	{
		this.scene.clearItems();
		this.floorplan.loadFloorplan(floorplan);
		items.forEach((item) => {
			var position = new Vector3(item.xpos, item.ypos, item.zpos);
			var metadata = {itemName: item.item_name,resizable: item.resizable,itemType: item.item_type,modelUrl: item.model_url};
			var scale = new Vector3(item.scale_x,item.scale_y,item.scale_z);
			this.scene.addItem(item.item_type,item.model_url,metadata,position,item.rotation,scale,item.fixed);
		});
	}
}
