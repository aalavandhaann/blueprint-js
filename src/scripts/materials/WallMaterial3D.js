import { Material3D } from "./Material3D";

export class WallMaterial3D extends Material3D {
    constructor(parameters, textureMapPack, scene) {
        super(parameters, textureMapPack, scene, false);
        this.roughness = 0.7;
        this.normalScale.set(100, 100);
    }
}