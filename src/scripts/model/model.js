import {EVENT_LOADED, EVENT_LOADING, EVENT_GLTF_READY} from '../core/events.js';
import {EventDispatcher, Vector3, Mesh} from 'three';
import {Floorplan} from './floorplan.js';
import {Scene} from './scene.js';

import {OBJExporter} from '../exporters/OBJExporter.js';

import GLTFExporter from 'three-gltf-exporter';

/**
 * A Model is an abstract concept the has the data structuring a floorplan. It connects a {@link Floorplan} and a {@link Scene}
 */
export class Model extends EventDispatcher
{
	/** Constructs a new model.
	 * @param textureDir The directory containing the textures.
	 */
	constructor(textureDir)
	{
		super();
		this.floorplan = new Floorplan();
		this.scene = new Scene(this, textureDir);
		this.roomLoadingCallbacks = null;
		this.roomLoadedCallbacks = null;
		this.roomSavedCallbacks = null;
		this.roomDeletedCallbacks = null;

	}

	switchWireframe(flag)
	{
		this.scene.switchWireframe(flag);
	}

	loadSerialized(json)
	{
		// TODO: better documentation on serialization format.
		// TODO: a much better serialization format.
		this.dispatchEvent({type: EVENT_LOADING, item: this});
		//      this.roomLoadingCallbacks.fire();

		var data = JSON.parse(json);
		this.newRoom(data.floorplan, data.items);

		this.dispatchEvent({type: EVENT_LOADED, item: this});
		//      this.roomLoadedCallbacks.fire();
	}

	exportMeshAsObj()
	{
		var exporter = new OBJExporter();
		return exporter.parse(this.scene.getScene());
	}

	exportForBlender()
	{
		var scope = this;
		var gltfexporter = new GLTFExporter();
		var meshes = [];
		this.scene.getScene().traverse( function(child)
		{
			if (child instanceof Mesh)
			{
				if(child.material)
				{
					if(child.material.length || child.material.visible)
					{
						var op = (child.material.transparent)? child.material.opacity: undefined;
						meshes.push(child);
						if(op)
						{
							child.material.opacity = op;
						}
					}
				}
			}
		  });

		gltfexporter.parse(meshes, function(result)
		{
			var output = JSON.stringify( result, null, 2 );
			scope.dispatchEvent({type:EVENT_GLTF_READY, item: this, gltf: output});
		});
	}

	exportSerialized()
	{
		var items_arr = [];
		var objects = this.scene.getItems();
		for (var i = 0; i < objects.length; i++)
		{
			var obj = objects[i];
//			items_arr[i] = {item_name: obj.metadata.itemName,item_type: obj.metadata.itemType,model_url: obj.metadata.modelUrl,xpos: obj.position.x,ypos: obj.position.y,zpos: obj.position.z,rotation: obj.rotation.y,scale_x: obj.scale.x,scale_y: obj.scale.y,scale_z: obj.scale.z,fixed: obj.fixed};
			items_arr[i] = obj.getMetaData();
		}

		var room = {floorplan: (this.floorplan.saveFloorplan()),items: items_arr};
		return JSON.stringify(room);
	}

	newRoom(floorplan, items)
	{
		this.scene.clearItems();
		this.floorplan.loadFloorplan(floorplan);
		items.forEach((item) => {
			var matColors = (item.material_colors) ? item.material_colors : [];
			var position = new Vector3(item.xpos, item.ypos, item.zpos);
			var metadata = {itemName: item.item_name,resizable: item.resizable,format: item.format, itemType: item.item_type, modelUrl: item.model_url, materialColors: matColors};
			var scale = new Vector3(item.scale_x,item.scale_y,item.scale_z);
			this.scene.addItem(item.item_type,item.model_url,metadata,position,item.rotation,scale,item.fixed);
		});
	}
}
