import { MeshStandardMaterial, TextureLoader, RepeatWrapping, MeshPhysicalMaterial } from "three";

export class Material3D extends MeshPhysicalMaterial {
    constructor(parameters, textureMapPack, scene) {
        super(parameters);

        this.__scene = scene;
        this.__textureMapPack = textureMapPack;
        this.__uRatio = 1.0;
        this.__vRatio = 1.0;
        this.__repeatPerCentimeter = 1.0 / this.__textureMapPack.repeat; //Repeat for every 50 centimeters
        this.__colorTexture = null;
        this.__normalTexture = null;
        this.__roughnessTexture = null;
        this.__ambientTexture = null;
        this.__applyNewTextures();
    }

    __updateTextures() {
        if (this.colorTexture) {
            this.__colorTexture.wrapS = this.__colorTexture.wrapT = RepeatWrapping;
            this.__colorTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__colorTexture.needsUpdate = true;
        }

        if (this.__normalTexture) {
            this.__normalTexture.wrapS = this.__normalTexture.wrapT = RepeatWrapping;
            this.__normalTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__normalTexture.needsUpdate = true;
        }

        if (this.__roughnessTexture) {
            this.__roughnessTexture.wrapS = this.__roughnessTexture.wrapT = RepeatWrapping;
            this.__roughnessTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__roughnessTexture.needsUpdate = true;
        }
        if (this.__ambientTexture) {
            this.__ambientTexture.wrapS = this.__ambientTexture.wrapT = RepeatWrapping;
            this.__ambientTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__ambientTexture.needsUpdate = true;
        }
        this.needsUpdate = true;
        this.__scene.needsUpdate = true;
    }

    __colorTextureLoaded(texture) {
        if (this.__colorTexture) {
            this.__colorTexture.dispose();
        }
        this.__colorTexture = texture;
        this.__colorTexture.wrapS = this.__colorTexture.wrapT = RepeatWrapping;
        this.__colorTexture.repeat.set(this.__uRatio, this.__vRatio);
        this.__colorTexture.needsUpdate = true;
        this.map = this.__colorTexture;
        this.__scene.needsUpdate = true;
    }
    __normalTextureLoaded(texture) {
        if (this.__normalTexture) {
            this.__normalTexture.dispose();
        }
        this.__normalTexture = texture;
        this.__normalTexture.wrapS = this.__normalTexture.wrapT = RepeatWrapping;
        this.__normalTexture.repeat.set(this.__uRatio, this.__vRatio);
        this.__normalTexture.needsUpdate = true;
        this.normalMap = this.__normalTexture;
        this.__scene.needsUpdate = true;
    }
    __roughnessTextureLoaded(texture) {
        if (this.__roughnessTexture) {
            this.__roughnessTexture.dispose();
        }
        this.__roughnessTexture = texture;
        this.__roughnessTexture.wrapS = this.__roughnessTexture.wrapT = RepeatWrapping;
        this.__roughnessTexture.repeat.set(this.__uRatio, this.__vRatio);
        this.__roughnessTexture.needsUpdate = true;
        this.roughnessMap = this.__roughnessTexture;
        this.__scene.needsUpdate = true;
    }
    __ambientTextureLoaded(texture) {
        if (this.__ambientTexture) {
            this.__ambientTexture.dispose();
        }
        this.__ambientTexture = texture;
        this.__ambientTexture.wrapS = this.__ambientTexture.wrapT = RepeatWrapping;
        this.__ambientTexture.repeat.set(this.__uRatio, this.__vRatio);
        this.__ambientTexture.needsUpdate = true;
        this.aoMap = this.__ambientTexture;
        this.__scene.needsUpdate = true;
    }
    __applyNewTextures() {
        if (this.__textureMapPack.colormap) {
            let colorTexture = new TextureLoader().load(this.__textureMapPack.colormap, this.__colorTextureLoaded.bind(this));
        }
        if (this.__textureMapPack.normalmap) {
            let normalTexture = new TextureLoader().load(this.__textureMapPack.normalmap, this.__normalTextureLoaded.bind(this));
        }
        if (this.__textureMapPack.roughnessmap) {
            let roughnessTexture = new TextureLoader().load(this.__textureMapPack.roughnessmap, this.__roughnessTextureLoaded.bind(this));
        }
        if (this.__textureMapPack.ambientmap) {
            let ambientTexture = new TextureLoader().load(this.__textureMapPack.ambientmap, this.__ambientTextureLoaded.bind(this));
        }
    }

    /**
     * 
     * @param {Number} x - Always implies the direction of the width 
     * @param {Number} y - Can be either length or height depending if wall or floor using this texture
     */
    updateDimensions(width, lengthOrHeight) {
        this.__uRatio = Math.max(width * this.__repeatPerCentimeter, 1.0);
        this.__vRatio = Math.max(lengthOrHeight * this.__repeatPerCentimeter, 1.0);
        this.__updateTextures();
    }

    get textureMapPack() {
        return this.__textureMapPack;
    }

    set textureMapPack(tpack) {
        this.__textureMapPack = tpack;
        this.color = tpack.color;
        this.__repeatPerCentimeter = 1.0 / tpack.repeat;
        this.__applyNewTextures();
    }

}