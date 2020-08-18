import { Material3D } from "./Material3D";

export class WallMaterial3D extends Material3D {
    constructor(parameters, textureMapPack, scene) {
        super(parameters, textureMapPack, scene, true);
        this.roughness = 0.7;
    }

    get textureMapPack() {
        return this.__textureMapPack;
    }

    set textureMapPack(tpack) {
        super.textureMapPack = tpack;
        if (tpack.reflective) {
            this.roughness = tpack.reflective;
        } else {
            this.roughness = 0.7;
        }
    }
}