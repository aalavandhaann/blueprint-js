import { EVENT_LOADED, EVENT_LOADING, EVENT_ITEM_REMOVED, EVENT_NEW_PARAMETRIC_ITEM, EVENT_NEW_ITEM, EVENT_MODE_RESET, EVENT_EXTERNAL_FLOORPLAN_LOADED } from '../core/events.js';
import { EventDispatcher } from 'three';
import { Floorplan } from './floorplan.js';
import { Utils } from '../core/utils.js';
import { Factory } from '../items/factory.js';

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
    }

    switchWireframe(flag) {
        this.scene.switchWireframe(flag);
    }

    loadSerialized(json) {
        // TODO: better documentation on serialization format.
        // TODO: a much better serialization format.
        this.dispatchEvent({ type: EVENT_LOADING, item: this });
        //      this.roomLoadingCallbacks.fire();

        var data = JSON.parse(json);
        this.newDesign(data.floorplan, data.items);
        this.dispatchEvent({ type: EVENT_LOADED, item: this, });
    }

    loadLockedSerialized(json) {
        var data = JSON.parse(json);
        this.floorplan.loadLockedFloorplan(data.floorplan);
        this.dispatchEvent({ type: EVENT_EXTERNAL_FLOORPLAN_LOADED, item: this, });
    }

    exportSerialized() {
        let floorplanJSON = this.floorplan.saveFloorplan();
        let roomItemsJSON = [];
        this.__roomItems.forEach((item) => {
            // item.updateMetadataExplicit();
            roomItemsJSON.push(item.metadata);
        });
        var room = { floorplan: floorplanJSON, items: roomItemsJSON };
        return JSON.stringify(room);
    }

    newDesign(floorplan, items) {
        this.__roomItems = [];
        this.floorplan.loadFloorplan(floorplan);
        for (let i = 0; i < items.length; i++) {
            let itemMetaData = items[i];
            let itemType = itemMetaData.itemType;
            let item = new(Factory.getClass(itemType))(itemMetaData, this, itemMetaData.id);
            this.__roomItems.push(item);
        }
    }

    reset() {
        this.floorplan.reset();
        this.__roomItems.length = 0;
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
        this.__roomItems = [];
    }

    /**
     * Removes an item.
     * @param item The item to be removed.
     * @param dontRemove If not set, also remove the item from the items list.
     */
    removeItem(item, keepInList) {
        // use this for item meshes
        this.remove(item, keepInList);
        this.dispatchEvent({ type: EVENT_ITEM_REMOVED, item: item });
    }

    /** Removes a non-item, basically a mesh, from the scene.
     * @param mesh The mesh to be removed.
     */
    remove(roomItem, keepInList) {
        keepInList = keepInList || false;
        if (!keepInList) {
            roomItem.destroy();
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
        //TODO
        this.dispatchEvent({ type: EVENT_NEW_ITEM, item: null });
    }
    addItem(item) {
        this.__roomItems.push(item);
        this.dispatchEvent({ type: EVENT_NEW_ITEM, item: item });
    }

    get roomItems() {
        return this.__roomItems;
    }

    get floorplan() {
        return this.__floorplan;
    }
}