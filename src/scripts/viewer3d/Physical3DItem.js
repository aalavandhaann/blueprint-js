import {
    Mesh, FontLoader, Line, TextGeometry, BufferGeometry, Box3, MathUtils, Group, Object3D,
    ExtrudeBufferGeometry, BoundingBoxHelper, Vector3, VertexColors, ArrowHelper, AxesHelper,
    SphereGeometry, MeshBasicMaterial, Matrix4, sRGBEncoding, LinearEncoding, PointLightHelper,
    SpotLight, PointLight, SpotLightHelper,TextureLoader,RepeatWrapping,MeshPhongMaterial, Plane, CompressedPixelFormat
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EVENT_ITEM_LOADED, EVENT_ITEM_LOADING, EVENT_UPDATED, EVENT_PARAMETRIC_GEOMETRY_UPATED } from "../core/events";
import { Utils } from "../core/utils"
import { BoxGeometry, LineBasicMaterial, LineSegments, EdgesGeometry, ObjectLoader } from "three";
import { FloorMaterial3D } from "../materials/FloorMaterial3D";
import {ConfigurationHelper} from '../helpers/ConfigurationHelper';
import { Configuration,shadowVisible } from '../core/configuration.js';
import {gsap, Power0} from 'gsap';
import { Vector2 } from "three/build/three.module";
import { WallFloorItem } from "../items/wall_floor_item";
import { InWallItem } from '../items/in_wall_item';
import { InWallFloorItem } from '../items/in_wall_floor_item';
import { ItemStatistics3D } from "./ItemStatistics3D";
// import { Group } from "three/build/three.module";

export class Physical3DItem extends Mesh {
    constructor(itemModel, dragControls, opts) {
        super();
        opts = opts || {};
        let options = {
            statistics: {
                dimension: {
                    unselectedColor: 0xFFFF00,
                    selectedColor: 0xFFFF00   
                },
                distance: {
                    unselectedColor: 0xF0F0F0,
                    selectedColor: 0xF0F0F0   
                }    
            }            
        };
        for (let opt in options) {
            if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
                options[opt] = opts[opt];
            }
        }
        let boxHelperMaterial = new LineBasicMaterial({ color: 0x0000F0, linewidth: 2, transparent: true });
        this.__options = options;
        this.__itemModel = itemModel;
        this.__dragControls = dragControls;
        this.__box = null;
        this.castShadow = true;
        this.receiveShadow = true;
        this.__shadowVisible = true;
        this.__center = null;
        this.__size = null;
        this.__itemType = null;
        this.__selected = false;
        this.__currentPosition = new Vector3();
        /** Show rotate option in context menu */
        this.allowRotate = true;
        this.halfSize = this.__itemModel.halfSize;//new Vector3(0, 0, 0);


        this.__selectedMaterial = boxHelperMaterial;
        this.__boxhelper = new LineSegments(new EdgesGeometry(new BoxGeometry(1, 1, 1)), this.__selectedMaterial);
        this.__boxMaterialAnimator = gsap.fromTo(
            this.__boxhelper.material, 
            {
                opacity: 1.0
            },
            { 
                opacity: 0.0, 
                duration: 1.0, 
                repeat: 0, 
                yoyo: true, 
                ease: Power0.easeNone, 
                paused: true,
                onStart: function(){
                    this.__boxhelper.visible = true;
                }.bind(this),
                onFinish: function(){                
                    this.__boxhelper.visible = false;
                    // this.__boxhelper.material.opacity = 0.0;
                }.bind(this)
        });
        this.__itemStatistics = null;
        
        this.__dimensionHelper = new Group();
        this.__measurementgroup = new Object3D();
        this.__pointLightHelper = null;
        this.__spotLightHelper = null;
        this.__customIntersectionPlanes = []; // Useful for intersecting only wall planes, only floorplanes, only ceiling planes etc
        this.configurationHelper = new ConfigurationHelper();
        this.__gltfLoader = new GLTFLoader();
        this.__gltfLoadingProgressEvent = this.__gltfLoadingProgress.bind(this);
        this.__gltfLoadedEvent = this.__gltfLoaded.bind(this);
        this.__itemUpdatedEvent = this.__itemUpdated.bind(this);
        this.__parametricGeometryUpdateEvent = this.__parametricGeometryUpdate.bind(this);

        this.__itemModel.addEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
        this.add(this.__boxhelper);
        this.selected = false;
        this.position.copy(this.__itemModel.position);
        if (this.__itemModel.isParametric) {
            this.__createParametricItem();
        } else {
            this.__loadItemModel();
        }
    }


    objectHalfSize(geometry) {
        geometry.computeBoundingBox();
        let objectBox = geometry.boundingBox.clone();
        return objectBox.max.clone().sub(objectBox.min).divideScalar(2);
    }

    __parametricGeometryUpdate(evt) {
        let mLocal = this.matrixWorld.clone().invert();//new Matrix4().getInverse(this.matrixWorld);
        this.__loadedItem.geometry = this.__itemModel.parametricClass.geometry;
        this.parent.needsUpdate = true;

        this.__box = this.__loadedItem.geometry.boundingBox.clone(); //new Box3().setFromObject(this.__loadedItem);
        this.__center = this.__box.getCenter(new Vector3());
        this.__size = this.__box.getSize(new Vector3());
        let localCenter = this.__center.clone().applyMatrix4(mLocal);
        let m = new Matrix4();
        m = m.makeTranslation(-localCenter.x, -localCenter.y, -localCenter.z);

        this.__boxhelper.geometry = new EdgesGeometry(new BoxGeometry(this.__size.x, this.__size.y, this.__size.z));
        // this.__boxhelper.geometry.applyMatrix4(m);

        this.__boxhelper.rotation.x = this.__itemModel.combinedRotation.x;
        this.__boxhelper.rotation.y = this.__itemModel.combinedRotation.y;
        this.__boxhelper.rotation.z = this.__itemModel.combinedRotation.z;
    }

    __itemUpdated(evt) {
        let scope = this;
        let duration = 0.25;
        if (!scope.parent) {
            return;
        }        
        if (evt.property === 'position') {
            this.position.set(this.__itemModel.position.x, this.__itemModel.position.y, this.__itemModel.position.z);
        }        
        
        if (evt.property === 'innerRotation') {
            if (this.__loadedItem) {
                this.__loadedItem.rotation.set(this.__itemModel.innerRotation.x, this.__itemModel.innerRotation.y, this.__itemModel.innerRotation.z);
            }
            this.__boxhelper.rotation.set(this.__itemModel.innerRotation.x, this.__itemModel.innerRotation.y, this.__itemModel.innerRotation.z);
            if(this.__itemStatistics){
                this.__itemStatistics.rotation.set(this.__itemModel.innerRotation.x, this.__itemModel.innerRotation.y, this.__itemModel.innerRotation.z);
            }               
        }
        if (evt.property === 'visible') {
            this.visible = this.__itemModel.visible;
        }
    }

    __initializeChildItem() {       
        this.name = 'Physical_' + this.__itemModel.__metadata.itemName;
        this.__box = new Box3().setFromObject(this.__loadedItem);
        this.__options.statistics['offsetToFront'] = (this.itemModel instanceof InWallItem || this.itemModel instanceof InWallFloorItem)
        this.__itemStatistics = new ItemStatistics3D(this, this.__dragControls, this.__options.statistics);
        
        this.__center = this.__box.getCenter(new Vector3());
        this.__size = this.__box.getSize(new Vector3());
        //this.__itemModel.__metadata.size=this.__size.toArray();
        this.__itemType = this.__itemModel.__metadata.itemType;
        this.__loadedItem.castShadow = true;
        this.__loadedItem.receiveShadow = true;

        this.__boxhelper.geometry = new EdgesGeometry(new BoxGeometry(this.__size.x, this.__size.y, this.__size.z));
        this.__loadedItem.rotation.x = this.__itemModel.innerRotation.x;
        this.__loadedItem.rotation.y = this.__itemModel.innerRotation.y;
        this.__loadedItem.rotation.z = this.__itemModel.innerRotation.z;

        this.__boxhelper.rotation.x = this.__itemModel.innerRotation.x;
        this.__boxhelper.rotation.y = this.__itemModel.innerRotation.y;
        this.__boxhelper.rotation.z = this.__itemModel.innerRotation.z;

        this.__itemStatistics.rotation.copy(this.__loadedItem.rotation);

        if (this.__itemModel.__metadata.isLight) {
            this.__loadedItem.name = this.__itemModel.__metadata.itemName;
            this.parent.__light3d.push(this.__loadedItem);
        }

        this.geometry = new BoxGeometry(this.__size.x, this.__size.y, this.__size.z, 1, 1, 1);

        this.geometry.computeBoundingBox();
        if (this.__itemModel.__metadata.custom != undefined) {
            this.position.y = this.geometry.boundingBox.max.y + 2;
        }
        if (this.__itemModel.__metadata.WallItem != undefined) {
            // debugger;
            this.position.y = this.__itemModel.__metadata.position[1];
        }
        // this.halfSize = this.objectHalfSize(this.geometry);
        this.material.visible = false;
        this.material.transparent = true;
        this.material.opacity = 0;
        this.userData.currentPosition = this.__currentPosition;
        // console.log(this);
        let scope = this;
        if (scope.parent) {
            scope.parent.needsUpdate = true;
        }
        

        this.__itemStatistics.updateDimensions();
        this.__itemStatistics.updateDistances();
        this.__itemStatistics.turnOffDistances();
        this.add(this.__loadedItem);
        this.add(this.__itemStatistics);

        this.dispatchEvent({ type: EVENT_UPDATED });
    }

    __loadItemModel() {
        this.__itemModel.name = this.__itemModel.__metadata.itemName || null;
        if (!this.__itemModel.modelURL || this.__itemModel.modelURL === undefined || this.__itemModel.modelURL === 'undefined') {
            return;
        }

        if (this.__loadedItem) {
            this.remove(this.__loadedItem);
        }
        this.__gltfLoader.load(this.__itemModel.modelURL, this.__gltfLoadedEvent, this.__gltfLoadingProgressEvent);
    }

    // Function - Add the textures to the models
    initColor(parent, type, mtl) {
        let texturepack = {};
        let material = new FloorMaterial3D({}, texturepack, parent);
        material.__multiComponentTextureUpdate(texturepack,parent,mtl);
    }

    __initialMaterial(){
        let meshList = [];
        let meshMap = [];
        if(this.__itemModel.textures.length!=0){
            this.initColor(this.__loadedItem, '', this.__itemModel.textures);
        }else{
            this.__loadedItem.children.forEach((mesh) => {
                meshList.push(mesh.name)
                meshMap.push({ name: mesh.name, texture: '', color: '', shininess: 10, size: [] })
            });
            this.__itemModel.__metadata.mesh = meshList;
            this.__itemModel.__metadata.textures = meshMap;
        }
    }


    __gltfLoaded(gltfModel) {

        this.__itemModelglb = gltfModel;
        this.__loadedItem = gltfModel.scene;
        this.__loadedItem.castShadow = this.__shadowVisible;
        this.__loadedItem.receiveShadow = this.__shadowVisible;
        this.__loadedItem.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = this.__shadowVisible;
                child.receiveShadow = true;            
            }
            if (child.material) {
                let materials = (child.material.length) ? child.materials : [child.material];
                materials.forEach((material) => {
                    if(material.map){
                        material.map.encoding = sRGBEncoding;
                        material.map.anisotropy = 16;
                    }
                    if(material.opacity < 1.0-1e-6){
                        material.transparent = true;
                        child.castShadow = false;
                    }
                });
            }
            
        });

        this.__initialMaterial();
        this.__initializeChildItem();
       
        this.dispatchEvent({ type: EVENT_ITEM_LOADED });
    }

    __gltfLoadingProgress(xhr) {
        this.dispatchEvent({ type: EVENT_ITEM_LOADING, loaded: xhr.loaded, total: xhr.total, percent: (xhr.loaded / xhr.total) * 100, jsraw: xhr });
    }

    __createParametricItem() {
        let parametricData = this.__itemModel.parametricClass;
        if (parametricData) {
            this.__loadedItem = new Mesh(parametricData.geometry, parametricData.material);
            this.__itemModel.parametricClass.addEventListener(EVENT_PARAMETRIC_GEOMETRY_UPATED, this.__parametricGeometryUpdateEvent);
            this.__initializeChildItem();
            this.dispatchEvent({ type: EVENT_ITEM_LOADED });
        }
    }

    dispose() {
        this.__itemModel.dispose();
        this.__itemModel.removeEventListener(EVENT_UPDATED, this.__itemUpdatedEvent);
        this.parent.remove(this);
    }

    /**
     * 
     * @param {Vector3} position 
     * @param {Boolean} midPoints 
     * @param {Boolean} forWallItem 
     * @param {Boolean} noConversionTo2D 
     * @description Returns the plane that make up this item based on its size. For a floor item it returns
     * the plane on (x, z) coordinates. For a wall item depending on its orientation it will return the plane.
     * Also if the noConversionTo3D is true, it returns the plane on the wall in 3D.
     * @returns {Array} of {Vector2} or {Vector3} depending on noConversionTo2D
     */
    getItemPolygon(position=null, midPoints = false, forWallItem = false, noConversionTo2D=false, scale=1.0){
        let coords = [];
        let c1 = new Vector3(-this.halfSize.x, (!forWallItem) ? 0 : -this.halfSize.y, (forWallItem) ? 0 : -this.halfSize.z);
        let c2 = new Vector3(this.halfSize.x, (!forWallItem) ? 0 : -this.halfSize.y, (forWallItem) ? 0 : -this.halfSize.z);
        let c3 = new Vector3(this.halfSize.x, (!forWallItem) ? 0 : this.halfSize.y, (forWallItem) ? 0 : this.halfSize.z);
        let c4 = new Vector3(-this.halfSize.x, (!forWallItem) ? 0 : this.halfSize.y, (forWallItem) ? 0 : this.halfSize.z);
        let midC1C2 = null;
        let midC2C3 = null;
        let midC3C4 = null;
        let midC4C1 = null;
        
        let rotationTransform = new Matrix4();
        let scaleTransform = new Matrix4();
        let translateTransform = new Matrix4();
        
        position = position || this.__itemModel.position;
        scaleTransform.scale(new Vector3(scale, scale, scale));
        if(forWallItem){
            rotationTransform.makeRotationY(this.__itemModel.rotation.y);
        }
        else{
            rotationTransform.makeRotationY(this.__itemModel.innerRotation.y);
        }
        rotationTransform.multiply(scaleTransform);

        c1 = c1.applyMatrix4(rotationTransform);
        c2 = c2.applyMatrix4(rotationTransform);
        c3 = c3.applyMatrix4(rotationTransform);
        c4 = c4.applyMatrix4(rotationTransform);

        translateTransform.setPosition(new Vector3(position.x, position.y, position.z));
        
        c1 = c1.applyMatrix4(translateTransform);
        c2 = c2.applyMatrix4(translateTransform);
        c3 = c3.applyMatrix4(translateTransform);
        c4 = c4.applyMatrix4(translateTransform);        
        
        if(forWallItem){
            coords.push(c1);        
            coords.push(c2);
            coords.push(c3);
            coords.push(c4);
        }
        else{
            coords.push(new Vector2(c1.x, c1.z));        
            coords.push(new Vector2(c2.x, c2.z));
            coords.push(new Vector2(c3.x, c3.z));
            coords.push(new Vector2(c4.x, c4.z));
        }        

        if(midPoints){
            midC1C2 = c1.clone().add(c2.clone().sub(c1).multiplyScalar(0.5));
            midC2C3 = c2.clone().add(c3.clone().sub(c2).multiplyScalar(0.5));
            midC3C4 = c3.clone().add(c4.clone().sub(c3).multiplyScalar(0.5));
            midC4C1 = c4.clone().add(c1.clone().sub(c4).multiplyScalar(0.5));
            if(forWallItem){
                coords.push(midC1C2);
                coords.push(midC2C3);
                coords.push(midC3C4);
                coords.push(midC4C1);
            }
            else{
                coords.push(new Vector2(midC1C2.x, midC1C2.z));
                coords.push(new Vector2(midC2C3.x, midC2C3.z));
                coords.push(new Vector2(midC3C4.x, midC3C4.z));
                coords.push(new Vector2(midC4C1.x, midC4C1.z));
            }            
        }

        if(forWallItem && !noConversionTo2D){
            return Utils.polygons2DFrom3D(coords);
        }
        else if(forWallItem && noConversionTo2D)
        {
            return coords;
        }
        return coords;
    }   

    getAlignedPositionForFloor(toAlignWith){
        function getCoordinate3D(selected, alignWith, position){
            let vector = null;
            selected = new Vector3(selected.x, position.y, selected.y);
            alignWith = new Vector3(alignWith.x, position.y, alignWith.y);
            vector = selected.clone().sub(position);
            return alignWith.clone().sub(vector);

        }
        let myPosition = this.__itemModel.position;
        let myPolygon2D = this.getItemPolygon(myPosition, true);
        let otherPolygon2D = toAlignWith.getItemPolygon(null, true);
        let minimalDistance = 9999999.0;//Set a threshold of 10 cms to check closest points
        let finalCoordinate3d = null;        
        myPolygon2D.forEach((coord) => {
            otherPolygon2D.forEach((otherCoord)=>{
                let distance = coord.clone().sub(otherCoord).length();
                if(distance < minimalDistance){   
                    finalCoordinate3d = getCoordinate3D(coord, otherCoord, myPosition);
                    minimalDistance = distance;
                }
            });
        });          
        return finalCoordinate3d;
    }

    getAlignedPositionForWall(toAlignWith){
        function getCoordinate3D(selected, alignWith, position){
            let vector = null;
            let newPosition = null;
            vector = selected.clone().sub(position).multiplyScalar(1.001);
            newPosition = alignWith.clone().sub(vector);
            return newPosition;
        }
        let myPosition = this.__itemModel.position;
        let myPolygon3D = this.getItemPolygon(null, true, true, true);
        let otherPolygon3D = toAlignWith.getItemPolygon(null, true, true, true);
        let minimalDistance = 10.0;//Set a threshold of 10 cms to check closest points
        let finalCoordinate3d = null;
        myPolygon3D.forEach((coord) => {
            otherPolygon3D.forEach((otherCoord)=>{
                let distance = coord.clone().sub(otherCoord).length();
                if(distance < minimalDistance){                    
                    finalCoordinate3d = getCoordinate3D(coord, otherCoord, myPosition);
                    minimalDistance = distance;
                }
            });
        });
        return finalCoordinate3d;
    }

    handleFloorItemsPositioning(coordinate3d, normal, intersectingPlane){
        let coordinate3dOriginal = coordinate3d.clone();
        let withinRoomBounds = false;
        let myPolygon2D = this.getItemPolygon(coordinate3d, false);
        let rooms = this.__itemModel.model.floorplan.getRooms();
        let i = 0;
        let isBoundToFloor = this.itemModel.isBoundToFloor;
        let isBoundToRoof = this.itemModel.isBoundToRoof;
        for (i = 0; i < rooms.length; i++) {
            let flag = Utils.polygonInsidePolygon(myPolygon2D, rooms[i].interiorCorners);
            if(flag){
                withinRoomBounds = true;
            }            
        }
        if(this.itemModel.snap3D){
            myPolygon2D = this.getItemPolygon(coordinate3d, false, false, false, 1.25);
            for (i = 0; i < this.parent.physicalRoomItems.length;i++){
                let otherObject = this.parent.physicalRoomItems[i];
                let otherPolygon2D = null;
                let flag = false;
                if(otherObject != this && otherObject.itemModel.isBoundToFloor == isBoundToFloor && otherObject.itemModel.isBoundToRoof == isBoundToRoof){ 
                    otherPolygon2D = otherObject.polygon2D;
                    flag = Utils.polygonPolygonIntersect(myPolygon2D, otherPolygon2D);
                    if(flag){
                        let alignedCoordinate = this.getAlignedPositionForFloor(otherObject);
                        otherObject.animateBounds();
                        if(alignedCoordinate){
                            coordinate3d = alignedCoordinate;
                        }                    
                        break;
                    }
                }
            }
        }
        if(withinRoomBounds || this.itemModel instanceof WallFloorItem){
            if(this.__itemModel.isBoundToRoof){
                coordinate3d.y = coordinate3dOriginal.y;
            }
            this.__itemModel.snapToPoint(coordinate3d, normal, intersectingPlane, this);
        }   
    }

    handleWallItemsPositioning(coordinate3d, normal, intersectingPlane){
        let myPolygon2D = this.getItemPolygon(coordinate3d, false, true, false, 1.5);
        let i = 0;
        let myWallUUID = (this.itemModel.currentWall) ? this.itemModel.currentWall.uuid : null;
        if(this.itemModel.snap3D){
            // console.log(myPolygon2D);
            for (i = 0; i < this.parent.physicalRoomItems.length;i++){
                let otherObject = this.parent.physicalRoomItems[i];
                let otherWallUUID = (otherObject.itemModel.isWallDependent && otherObject.itemModel.currentWall) ? otherObject.itemModel.currentWall.uuid: null;
                let otherPolygon2D = null;
                let flag = false;
                if(!myWallUUID || !otherWallUUID || myWallUUID != otherWallUUID){
                    continue;
                }
                if(otherObject != this){
                    // otherPolygon2D = otherObject.polygon2D;
                    otherPolygon2D = otherObject.getItemPolygon(null, false, true, false, 1.5);
                    // console.log(otherPolygon2D);
                    flag = Utils.polygonPolygonIntersect(myPolygon2D, otherPolygon2D);
                    if(flag){
                        let alignedCoordinate = this.getAlignedPositionForWall(otherObject);
                        if(alignedCoordinate){
                            coordinate3d = alignedCoordinate;
                        }
                        break;
                    }
                }
            }
        }
        this.__itemModel.snapToPoint(coordinate3d, normal, intersectingPlane, this);
    }

    snapToPoint(coordinate3d, normal, intersectingPlane) {
        if(this.itemModel.isWallDependent){
            this.handleWallItemsPositioning(coordinate3d, normal, intersectingPlane);            
            return;
        }
        this.handleFloorItemsPositioning(coordinate3d, normal, intersectingPlane);
    }   

    snapToWall(coordinate3d, wall, wallEdge) {
        this.__itemModel.snapToWall(coordinate3d, wall, wallEdge);
    }

    animateBounds(){
        // this.__boxhelper.visible = true;
        // this.__boxhelper.material.opacity = 1.0;
        // if(!this.__boxMaterialAnimator.isActive()){
            this.__boxMaterialAnimator.play(0);
        // }
    }

    get loadedItem(){
        return this.__loadedItem;
    }

    get statistics(){
        return this.__itemStatistics;
    }

    get worldBox(){
        // return this.box.clone().applyMatrix4(this.__loadedItem.matrixWorld.clone().multiply(this.matrixWorld));
        return this.box.clone().applyMatrix4(this.matrixWorld);
    }

    get box(){
        return this.__box;
    }

    get selected() {
        return this.__selected;
    }

    set selected(flag) {
        this.__selected = flag;
        this.__boxhelper.visible = flag;
        this.__boxhelper.material.opacity = (flag) ? 1.0 : 0.0;        
        this.__dimensionHelper.visible = flag;
        this.__measurementgroup.visible = flag;
    }

    set location(coordinate3d) {
        this.__itemModel.position = coordinate3d;
    }

    get location() {
        return this.__itemModel.position.clone();
    }

    get intersectionPlanes() {
        return this.__itemModel.intersectionPlanes;
    }

    get intersectionPlanes_wall() {
        return this.__itemModel.intersectionPlanes_wall;
    }

    get itemModel() {
        return this.__itemModel;
    }

    get polygon2D(){
        if(this.itemModel.isWallDependent){
            return this.getItemPolygon(null, false, true, false);
        }
        return this.getItemPolygon();
    }

    get boxhelper(){
        return this.__boxhelper;
    }
}

/**
export class Physical3DItem {
    constructor(itemModel) {
        console.log(this);
        return new Proxy(new Physical3DItemNonProxy(itemModel), {
            get(target, name, receiver) {
                console.log('USING REFLECT.GET ', target);
                if (!Reflect.has(target, name) && !Reflect.has(target.itemModel, name)) {
                    return undefined;
                }
                if (Reflect.has(target, name)) {
                    return Reflect.get(target, name);
                }
                if (Reflect.has(target.itemModel, name)) {
                    return Reflect.get(target.itemModel, name);
                }
                return undefined;
            }
        });
    }
}
 */