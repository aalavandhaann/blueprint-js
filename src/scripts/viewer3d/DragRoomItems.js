import { DragControl } from 'three/examples/jsm/controls/DragControls.js'
import { EventDispatcher } from 'three';
export class DragRoomItems extends EventDispatcher {
    constructor() {
        super();
        this.__draggableItems = [];

    }
}