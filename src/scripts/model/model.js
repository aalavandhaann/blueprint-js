// @ts-nocheck
import {
    EVENT_LOADED, EVENT_ROTATE_SELECTED,EVENT_NO_LIGHT_SELECTED,
    EVENT_LOADING, EVENT_ITEM_REMOVED, EVENT_WALL_CLICKED, EVENT_NEW_ITEM,
    EVENT_MODE_RESET, EVENT_EXTERNAL_FLOORPLAN_LOADED,EVENT_ITEM_UPDATE
} from '../core/events.js';
import { EventDispatcher,Vector3 } from 'three';
import { Floorplan } from './floorplan.js';
import { Utils } from '../core/utils.js';
import { Factory } from '../items/factory.js';
import { FloorItem } from '../items/floor_item';

/**
 * A Model is an abstract concept the has the data structuring a floorplan. It connects a {@link Floorplan} and a {@link Scene}
 */
export class Model extends EventDispatcher {
    /** Constructs a new model.
     * @param textureDir The directory containing the textures.
     */
    constructor() {
        super();
        this.__floorplan = new Floorplan();
        this.__roomItems = [];
        this.__lightItems = [];
        this.__environment=null;
        this.__floorItems = [];
        // this.__wallSelectedEvent = this.__wallSelected.bind(this);
        // this.addEventListener(EVENT_WALL_CLICKED, this.__wallSelectedEvent);
    }

    switchWireframe(flag) {
        this.scene.switchWireframe(flag);
    }
    __wallSelected(evt) {
        this.__selectedEdge = evt.item;
        this.__selectedEdgeNormal = evt.normal;
        this.__selectedEdgePoint = evt.point;
        this.__wallThickness = Dimensioning.cmToMeasureRaw(evt.item.thickness);
    }

    loadSerialized(json) {
        this.dispatchEvent({ type: EVENT_LOADING, item: this });
        var data = JSON.parse(json);
        this.newDesign(data.floorplanner || data.floorplan, data.items, data.lights,data.environment);
        this.dispatchEvent({ type: EVENT_LOADED, item: this});
    }

    exportSerialized() {
        let floorplanJSON = this.floorplan.saveFloorplan();
        let roomItemsJSON = [];
        this.__roomItems.forEach((item) => {
            // item.updateMetadataExplicit();
            roomItemsJSON.push(item.metadata);
        });
        var room = { floorplanner: floorplanJSON, items: roomItemsJSON };
        return JSON.stringify(room);
    }

    newDesign(floorplan, items, lights, environment) {
        this.__roomItems = [];
        this.__lightItems = [];
        this.__floorItems = [];
        this.floorplan.loadFloorplan(floorplan);
        for (let i = 0; i < items.length; i++) {
            let itemMetaData = items[i];
            let itemType = itemMetaData.itemType;
            let item = new (Factory.getClass(itemType))(itemMetaData, this, itemMetaData.id);
            // console.log(item);
            if (itemType === 1) {
                this.__floorItems.push(item);
            }
            this.__roomItems.push(item);
        }
    }

    reset() {
        this.__roomItems.forEach((item) =>{
            item.dispose();
        });
        this.floorplan.reset();
        this.__roomItems.length = 0;
        this.__lightItems.length = 0;
        // this.__hemtItem.length = 0;
        // this.__amblightItem.length = 0;
        // this.__sunItem.length = 0;
        this.__floorItems.length = 0;
        this.dispatchEvent({ type: EVENT_MODE_RESET });

    }

    /** Gets the items.
     * @returns The items.
     */
    getItems() {
        return this.__roomItems;
    }

    /** Gets the count of items.
     * @returns The count.
     */
    itemCount() {
        return this.__roomItems.length;
    }

    /** Removes all items. */
    clearItems() {
        let scope = this;
        this.__roomItems.forEach((item) => {
            scope.removeItem(item, false);
        });
        this.__floorItems.forEach((item) => {
            scope.removeItem(item, false);
        });
        this.__roomItems = [];
        this.__floorItems = [];
    }

    removeItemByMetaData(item) {
        this.removeItem(item.itemModel);
    }

    /**
     * Removes an item.
     * @param item The item to be removed.
     * @param dontRemove If not set, also remove the item from the items list.
     */
    removeItem(item, keepInList) {
        // use this for item meshes
        this.__roomItems.pop(item);
        this.remove(item, false);
        this.dispatchEvent({ type: EVENT_ITEM_REMOVED, item: item });
    }

    /** Removes a non-item, basically a mesh, from the scene.
     * @param mesh The mesh to be removed.
     */
     remove(roomItem, keepInList) {
        keepInList = keepInList || false;
        if (!keepInList) {
            roomItem.dispose();
            Utils.removeValue(this.__roomItems, roomItem);
        }
    }

    /**
     * Creates an item and adds it to the scene.
     * @param itemType The type of the item given by an enumerator.
     * @param fileName The name of the file to load.
     * @param metadata TODO
     * @param position The initial position.
     * @param rotation The initial rotation around the y axis.
     * @param scale The initial scaling.
     * @param fixed True if fixed.
     * @param newItemDefinitions - Object with position and 'edge' attribute if it is a wall item
     */
    addItemByMetaData(metadata) {
        let itemMetaData = metadata;
        let item = new FloorItem(itemMetaData, this);
        if (itemMetaData.itemType === 1) {
            this.__floorItems.push(item);
        }
        this.__roomItems.push(item);
        this.dispatchEvent({ type: EVENT_NEW_ITEM, item: item });
    }

    itemTextureColor(item, color) {
        this.dispatchEvent({ type: EVENT_ITEM_UPDATE, item: item, field: 'color', color });
    }

    itemTextureRepeat(item, color, repeat) {
        this.dispatchEvent({ type: EVENT_ITEM_UPDATE, item: item, field: 'repeat', color, repeat: parseFloat(repeat) });
    }

    lightUnSelected(){
        this.dispatchEvent({ type: EVENT_NO_LIGHT_SELECTED });
    }

    addItem(item) {
        this.__roomItems.push(item);
        this.dispatchEvent({ type: EVENT_NEW_ITEM, item: item });
    }

    rotateItem(item, x, y, z) {
        /**
         * Add to current innerRotation so the rotation is additive instead of being absolute
         */
        let eulerAngle = item.itemModel.innerRotation.clone().add(new Vector3(x, y, z));
        item.itemModel.innerRotation = eulerAngle;
    }

    get roomItems() {
        return this.__roomItems;
    }

    get floorplan() {
        return this.__floorplan;
    }

}