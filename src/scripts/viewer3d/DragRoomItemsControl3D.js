import { EventDispatcher, Vector2 } from 'three';
import {
    Plane, Raycaster, Vector3, Matrix4
} from 'three';
import { EVENT_ITEM_MOVE, EVENT_ITEM_MOVE_FINISH, EVENT_NO_ITEM_SELECTED, EVENT_WALL_CLICKED, EVENT_ROOM_CLICKED, EVENT_ITEM_SELECTED } from '../core/events';
import { IS_TOUCH_DEVICE } from '../../DeviceInfo';
import {ConfigurationHelper} from '../helpers/ConfigurationHelper';
/**
 * This is a custom implementation of the DragControls class
 * In this class the raycaster intersection will not check for children
 * This is supposed to work only for physicalroomitems because it creates
 * a invisible box geometry based on the loaded gltf
 */
export class DragRoomItemsControl3D extends EventDispatcher {
    constructor(walls, floors, items, roomplanner, domElement) {
        super();
        this.__walls = walls;
        this.__roomplanner = roomplanner;
        this.__floors = floors;
        this.__draggableItems = items;
        this.__camera = this.__roomplanner.camera;
        this.__domElement = domElement;
        this.__enabled = true;
        this.__transformGroup = false;
        this.__intersections = [];
        // this.__measurementgroup = [];
        this.__plane = new Plane();
        this.__raycaster = new Raycaster();
        this.__mouse = new Vector2();
        this.__mouseClient = new Vector2();
        this.__offset = new Vector3();
        this.__intersection = new Vector3();

        this.__worldPosition = new Vector3();
        this.__inverseMatrix = new Matrix4();
        this.__selected = null;
        this.__hovered = null;
        this.__timestamp = Date.now();

        this.configurationHelper = new ConfigurationHelper();

        this.__releasetimestamp = Date.now();
        this.__pressListenerEvent = this.__pressListener.bind(this);
        this.__releaseListenerEvent = this.__releaseListener.bind(this);
        this.__moveListenerEvent = this.__moveListener.bind(this);

        this.emissiveColor = 0x444444;
        this.arrowRotate = false;
        this.activate();
    }

    __updateMouse(evt){
        let rect = this.__domElement.getBoundingClientRect();
        this.__mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        this.__mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        this.__mouseClient.x=evt.clientX;
        this.__mouseClient.y=evt.clientY;
    }

    __pressListener(evt) {
        let time = Date.now();
        let deltaTime = time - this.__timestamp;        
        let wallPlanesThatIntersect = null;
        let floorPlanesThatIntersect = null;
        let minDistance = 1e6
        this.__timestamp = time;

        this.__updateMouse(evt);
        // evt.preventDefault();
        this.__domElement.onpointermove = this.__moveListenerEvent;
        this.__domElement.setPointerCapture(evt.pointerId);

        evt = (evt.changedTouches !== undefined) ? evt.changedTouches[0] : evt;

        this.__intersections.length = 0;

        let visibleDraggableItems = [];
        for (let i = 0; i < this.__draggableItems.length; i++) {
            if (this.__draggableItems[i].visible) {
                visibleDraggableItems.push(this.__draggableItems[i]);
            }
        }

        this.__raycaster.setFromCamera(this.__mouse, this.__camera);
        wallPlanesThatIntersect = this.__raycaster.intersectObjects(this.__walls, false);
        floorPlanesThatIntersect = this.__raycaster.intersectObjects(this.__floors, false);
        this.__intersections = this.__raycaster.intersectObjects(visibleDraggableItems, false);
        if(wallPlanesThatIntersect.length){
            minDistance = wallPlanesThatIntersect[0].distance;
        }
        if (this.__intersections.length) {
            if(this.__intersections[0].distance > minDistance){
                this.dispatchEvent({ type: EVENT_NO_ITEM_SELECTED, item: this.__selected });
                return;
            }
            this.__selected = (this.__transformGroup) ? this.__draggableItems[0] : this.__intersections[0].object;
            if (this.__raycaster.ray.intersectPlane(this.__plane, this.__intersection)) {

                this.__inverseMatrix = this.__selected.parent.matrixWorld.clone().invert();
                // this.__inverseMatrix.getInverse(this.__selected.parent.matrixWorld);
                /**
                 * The belwo line for plane setting normal and coplanar point is necessary for touch based events (ref: DragCOntrols.js in three) 
                 */
                this.__plane.setFromNormalAndCoplanarPoint(this.__camera.getWorldDirection(this.__plane.normal), this.__worldPosition.setFromMatrixPosition(this.__selected.matrixWorld));

                this.__offset.copy(this.__intersection).add(this.__worldPosition.setFromMatrixPosition(this.__selected.matrixWorld));
            }
            this.__domElement.style.cursor = 'move';
            
            if(this.__selected.statistics){
                this.__selected.statistics.turnOnDistances();
                this.__selected.statistics.updateDistances();
            }   
            this.dispatchEvent({ type: EVENT_ITEM_SELECTED, item: this.__selected });
            return;
        }
        if (deltaTime < 300) {
            if (wallPlanesThatIntersect.length) {
                this.dispatchEvent({ type: EVENT_WALL_CLICKED, item: wallPlanesThatIntersect[0].object.edge, point: wallPlanesThatIntersect[0].point, normal: wallPlanesThatIntersect[0].face.normal });
                return;
            } else if (floorPlanesThatIntersect.length) {
                this.dispatchEvent({ type: EVENT_ROOM_CLICKED, item: floorPlanesThatIntersect[0].object.room, point: floorPlanesThatIntersect[0].point, normal: floorPlanesThatIntersect[0].face.normal });
                return;
            }
        }
        this.dispatchEvent({ type: EVENT_NO_ITEM_SELECTED, item: this.__selected });
    }

    __releaseListener(evt) {
        let time = Date.now();
        let deltaTime = time - this.__releasetimestamp;
        this.__releasetimestamp = time;
        let wallPlanesThatIntersect = null;
        let floorPlanesThatIntersect = null;

        this.__updateMouse(evt);
        // evt.preventDefault();
        this.__domElement.onpointermove = null;
        this.__domElement.releasePointerCapture(evt.pointerId);


        evt = (evt.changedTouches !== undefined) ? evt.changedTouches[0] : evt;
        this.__raycaster.setFromCamera(this.__mouse, this.__camera);
        wallPlanesThatIntersect = this.__raycaster.intersectObjects(this.__walls, false);
        floorPlanesThatIntersect = this.__raycaster.intersectObjects(this.__floors, false);
        // if(!wallPlanesThatIntersect.length && !floorPlanesThatIntersect.length && !this.__selected){
        //     this.dispatchEvent({ type: EVENT_NO_ITEM_SELECTED, item: this.__selected });
        //     return;
        // }
        if (this.__selected) {
            if(this.__selected.statistics){
                this.__selected.statistics.turnOnDistances();
                this.__selected.statistics.updateDistances();
            }            
            this.__roomplanner.forceRender();
            this.dispatchEvent({ type: EVENT_ITEM_MOVE_FINISH, item: this.__selected, mouse: this.__mouseClient });
            this.__selected = null;
        } else {
            // evt = (evt.changedTouches !== undefined) ? evt.changedTouches[0] : evt;
            // this.__raycaster.setFromCamera(this.__mouse, this.__camera);
            // let wallPlanesThatIntersect = this.__raycaster.intersectObjects(this.__walls, false);
            // let floorPlanesThatIntersect = this.__raycaster.intersectObjects(this.__floors, false);
            if (deltaTime < 300) {
                if (wallPlanesThatIntersect.length) {
                    this.dispatchEvent({ type: EVENT_WALL_CLICKED, item: wallPlanesThatIntersect[0].object.edge, point: wallPlanesThatIntersect[0].point, normal: wallPlanesThatIntersect[0].face.normal });
                } else if (floorPlanesThatIntersect.length) {
                    this.dispatchEvent({ type: EVENT_ROOM_CLICKED, item: floorPlanesThatIntersect[0].object.room, point: floorPlanesThatIntersect[0].point, normal: floorPlanesThatIntersect[0].face.normal });
                }
            }
        }
        this.__domElement.style.cursor = (this.__hovered) ? 'pointer' : 'auto';
    }


    __moveListener(evt) {
        // evt.preventDefault();
        evt = (evt.changedTouches !== undefined) ? evt.changedTouches[0] : evt;

        this.__updateMouse(evt);
        this.__raycaster.setFromCamera(this.__mouse, this.__camera);
        if (this.__selected && this.__enabled && this.__selected.visible) {
            //Check if the item has customIntersectionPlanes, otherwise move it freely
            if (this.__selected.intersectionPlanes != undefined && !this.__selected.intersectionPlanes.length) {
                if (this.__raycaster.ray.intersectPlane(this.__plane, this.__intersection)) {
                    let location = this.__selected.location.clone().copy(this.__intersection.add(this.__offset).applyMatrix4(this.__inverseMatrix));
                    this.__selected.location = location;
                }
            } else {
                let customIntersectingPlanes = this.__selected.intersectionPlanes;
                let customIntersectingPlanes1 = this.__selected.intersectionPlanes_wall;
                customIntersectingPlanes = customIntersectingPlanes.concat(customIntersectingPlanes1);
                let customPlanesThatIntersect = this.__raycaster.intersectObjects(customIntersectingPlanes, false);
                if (customPlanesThatIntersect.length) {
                        let intersectionData = customPlanesThatIntersect[0];
                        this.__intersection = intersectionData.point;
                        let location = intersectionData.point;
                        let normal = intersectionData.face.normal;
                        let intersectingPlane = intersectionData.object;
                        this.__selected.__measurementgroup.visible =false;
                        this.__selected.__dimensionHelper.visible =false;
                        this.__selected.snapToPoint(location, normal, intersectingPlane);
                }
            }
            if(this.__selected.statistics){
                this.__selected.statistics.turnOnDistances();
                this.__selected.statistics.updateDistances();
            }    
            /**
             * START OF LINES FOR UPDATING THE DISTANCE OF AN OBJECT CONTINUOSLY
             * CAUTION: THIS MAKES THE APP REALLY SLOW
             */
            // if(this.__selected.statistics){
            //     // this.__selected.statistics.turnOnDistances();
            //     this.__selected.statistics.updateDistances();
            // } 
            //END OF LINES FOR  UPDATING THE DISTANCE OF AN OBJECT CONTINUOSLY
            this.dispatchEvent({ type: EVENT_ITEM_MOVE, item: this.__selected });
            // return;
        }

        if (IS_TOUCH_DEVICE) {
            return;
        }

        this.__intersections.length = 0;       
    }

    dispose() {
        this.deactivate();
    }

    activate() {
        this.__domElement.onpointerdown = this.__pressListenerEvent;
        this.__domElement.onpointerup = this.__releaseListenerEvent;
        // this.__domElement.addEventListener('pointerdown', this.__pressListenerEvent, false);
        // this.__domElement.addEventListener('touchstart', this.__pressListenerEvent, false);

        // // this.__domElement.addEventListener('pointermove', this.__moveListenerEvent, false);
        // // this.__domElement.addEventListener('touchmove', this.__moveListenerEvent, false);

        // this.__domElement.addEventListener('pointerup', this.__releaseListenerEvent, false);
        // // this.__domElement.addEventListener('mouseleave', this.__releaseListenerEvent, false);//Not necessary
        // this.__domElement.addEventListener('touchend', this.__releaseListenerEvent, false);

    }

    deactivate() {
        this.__domElement.onpointerdown = null;
        this.__domElement.onpointerup = null;
        // this.__domElement.removeEventListener('pointerdown', this.__pressListenerEvent, false);
        // this.__domElement.removeEventListener('touchstart', this.__pressListenerEvent, false);

        // // this.__domElement.removeEventListener('pointermove', this.__moveListenerEvent, false);
        // // this.__domElement.removeEventListener('touchmove', this.__moveListenerEvent, false);

        // this.__domElement.removeEventListener('pointerup', this.__releaseListenerEvent, false);
        // // this.__domElement.removeEventListener('mouseleave', this.__releaseListenerEvent, false);//Not necessary
        // this.__domElement.removeEventListener('touchend', this.__releaseListenerEvent, false);

        this.__domElement.style.cursor = '';

    }

    __rotateItems() {
        this.arrowRotate = true;
    }

    get selected(){
        return this.__selected;
    }

    set selected(selection){
        this.__selected = selection;
    }

    get enabled() {
        return this.__enabled;
    }

    set enabled(flag) {
        this.__enabled = flag;
    }

    get draggableItems() {
        return this.__draggableItems;
    }

    set draggableItems(items) {
        this.__draggableItems = items;
    }
}