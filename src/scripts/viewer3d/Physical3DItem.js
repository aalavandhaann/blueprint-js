import { Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EVENT_LOADING, EVENT_LOADED } from "../core/events";

export class Physical3DItem extends Mesh {
    constructor(itemModel) {
        super();
        this.__itemModel = itemModel;
        this.__gltfLoader = new GLTFLoader();
        this.__gltfLoadingProgressEvent = this.__gltfLoadingProgress.bind(this);
        this.__gltfLoadedEvent = this.__gltfLoaded.bind(this);
    }

    __loadItemModel() {
        if (!this.modelURL || this.modelURL === undefined || this.modelURL === 'undefined') {
            return;
        }

        if (this.__loadedItem) {
            this.remove(this.__loadedItem);
        }

        this.__gltfLoader.load(this.modelURL, this.__gltfLoadedEvent, this.__gltfLoadingProgressEvent);
    }

    __gltfLoaded(gltfModel) {
        this.__loadedItem = gltfModel.scene;
        this.add(this.__loadedItem);
        this.dispatchEvent({ type: EVENT_LOADED });
    }

    __gltfLoadingProgress(xhr) {
        this.dispatchEvent({ type: EVENT_LOADING, loaded: xhr.loaded, total: xhr.total, percent: (xhr.loaded / xhr.total) * 100, jsraw: xhr });
    }
}