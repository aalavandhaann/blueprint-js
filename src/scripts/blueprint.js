//Classes from core module
export {Version} from './core/version.js';

export {EVENT_SAVED, EVENT_UPDATED, EVENT_LOADING, EVENT_LOADED, EVENT_NEW, EVENT_ACTION} from './core/events.js';
export {EVENT_DELETED, EVENT_MOVED, EVENT_REDRAW, EVENT_CHANGED, EVENT_MODE_RESET} from './core/events.js';
export {EVENT_ITEM_LOADING, EVENT_ITEM_LOADED, EVENT_ITEM_REMOVED, EVENT_ITEM_SELECTED, EVENT_ITEM_UNSELECTED} from './core/events.js';
export {EVENT_CAMERA_MOVED, EVENT_CAMERA_ACTIVE_STATUS} from './core/events.js';
export {EVENT_WALL_CLICKED, EVENT_ROOM_CLICKED, EVENT_NOTHING_CLICKED, EVENT_FLOOR_CLICKED} from './core/events.js';

export {Utils} from './core/utils.js';
export {ELogContext, ELogLevel, logContext, isLogging, log} from './core/log.js';
export {dimInch, dimMeter, dimCentiMeter, Dimensioning} from './core/dimensioning.js';
export {configDimUnit, configWallHeight, configWallThickness, Configuration} from './core/configuration.js';

//Classes from model module
export {HalfEdge} from './model/half_edge.js';
export {cornerTolerance, Corner} from './model/corner.js';
export {defaultFloorPlanTolerance, Floorplans} from './model/floorplan.js';
export {Model} from './model/model.js';
export {defaultRoomTexture, Room} from './model/room.js';
export {Scene} from './model/scene.js';
export {defaultWallTexture, Wall} from './model/wall.js';

//Classes from floorplanner module
export {floorplannerModes, gridSpacing, gridWidth, gridColor, roomColor, wallWidth, wallWidthHover, edgeColor, edgeColorHover, edgeWidth, deleteColor, cornerRadius, cornerRadiusHover, cornerColor, cornerColorHover, FloorplannerView} from './floorplanner/floorplanner_view.js';
export {snapTolerance, Floorplanner} from './floorplanner/floorplanner.js';

//Classes from items module
export {item_types, Factory} from './items/factory.js';
export {Metadata} from './items/metadata.js';
export {Item} from './items/item.js';
export {FloorItem} from './items/floor_item.js';
export {WallItem} from './items/wall_item.js';
export {WallFloorItem} from './items/wall_floor_item.js';
export {OnFloorItem} from './items/on_floor_item.js';
export {InWallItem} from './items/in_wall_item.js';
export {InWallFloorItem} from './items/in_wall_floor_item.js';

//Classes from three module
export {states, Controller} from './three/controller.js';
export {OrbitControls} from './three/orbitcontrols.js';
export {FirstPersonControls} from './three/first-person-controls.js';
export {PointerLockControls} from './three/pointerlockcontrols.js';
export {STATE, Controls} from './three/controls.js';
export {Edge} from './three/edge.js';
export {Floor} from './three/floor.js';
export {Floorplan} from './three/floorPlan.js';
export {HUD} from './three/hud.js';
export {Lights} from './three/lights.js';
export {Main} from './three/main.js';
export {Skybox} from './three/skybox.js';

import {Model} from './model/model.js';
import {Main} from './three/main.js';
import {Floorplanner} from './floorplanner/floorplanner.js';
//
///** VestaDesigner core application. */
export class BlueprintJS 
{
	/**
	 * Creates an instance.
	 * 
	 * @param options
	 *            The initialization options.
	 */
	constructor(options) 
	{
		this.options = options;
		this.model = new Model(options.textureDir);
		this.three = new Main(this.model, options.threeElement, options.threeCanvasElement, {});

		if (!options.widget) 
		{
			this.floorplanner = new Floorplanner(options.floorplannerElement, this.model.floorplan);
		}
		else 
		{
			this.three.getController().enabled = false;
		}
	}
}
