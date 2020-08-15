import { Mesh, Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EVENT_ITEM_LOADED, EVENT_ITEM_LOADING } from "../core/events";

export class Physical3DItem extends Mesh {
    constructor(itemModel) {
        super();
        this.__itemModel = itemModel;
        this.__box = null;
        this.__center = null;
        this.__size = null;
        this.__gltfLoader = new GLTFLoader();
        this.__gltfLoadingProgressEvent = this.__gltfLoadingProgress.bind(this);
        this.__gltfLoadedEvent = this.__gltfLoaded.bind(this);
        this.__loadItemModel();
    }

    __loadItemModel() {
        if (!this.__itemModel.modelURL || this.__itemModel.modelURL === undefined || this.__itemModel.modelURL === 'undefined') {
            return;
        }

        if (this.__loadedItem) {
            this.remove(this.__loadedItem);
        }

        this.__gltfLoader.load(this.__itemModel.modelURL, this.__gltfLoadedEvent, this.__gltfLoadingProgressEvent);
    }

    __gltfLoaded(gltfModel) {
        this.__loadedItem = gltfModel.scene;
        this.__box = new Box3().setFromObject(this.__loadedItem);
        this.__center = this.__box.getCenter(new Vector3());
        this.__size = this.__box.getSize(new Vector3());
        console.log(this.__center, this.__size, this.__itemModel.size);
        this.add(this.__loadedItem);
        this.dispatchEvent({ type: EVENT_ITEM_LOADED });
    }

    __gltfLoadingProgress(xhr) {
        this.dispatchEvent({ type: EVENT_ITEM_LOADING, loaded: xhr.loaded, total: xhr.total, percent: (xhr.loaded / xhr.total) * 100, jsraw: xhr });
    }

    set location(coordinate3d) {
        this.__itemModel.position = coordinate3d;
    }

    get location() {
        return this.__itemModel.position.clone();
    }
}