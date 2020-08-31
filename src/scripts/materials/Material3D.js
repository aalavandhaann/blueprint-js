import { MeshStandardMaterial, TextureLoader, RepeatWrapping, Color, Vector2, sRGBEncoding } from 'three';
import { TEXTURE_DEFAULT_REPEAT } from '../core/constants';

export class Material3D extends MeshStandardMaterial {
    constructor(parameters, textureMapPack, scene, reflectsScene = false) {
        super(parameters);

        this.__scene = scene;
        this.__reflectsScene = reflectsScene;
        this.__mirrorCamera = null;

        // this.roughness = (!textureMapPack.reflective) ? 0.5 : textureMapPack.reflective;
        this.__repeat = (!textureMapPack.repeat) ? TEXTURE_DEFAULT_REPEAT : textureMapPack.repeat;

        if (this.__reflectsScene) {
            this.__mirrorCamera = this.__scene.environmentCamera;
            this.envMap = this.__mirrorCamera.renderTarget.texture;
        }
        this.__textureMapPack = textureMapPack;
        this.__uRatio = 1.0;
        this.__vRatio = 1.0;
        this.__dimensions = new Vector2();

        this.__repeatPerCentimeter = 1.0 / this.__repeat; //Repeat for every 'x' centimeters
        this.__colorTexture = null;
        this.__normalTexture = null;
        this.__roughnessTexture = null;
        this.__ambientTexture = null;
        this.__bumpTexture = null;
        this.__applyNewTextures();
        this.normalScale.set(-10, 10);
    }

    get envMapCamera() {
        return this.__mirrorCamera;
    }

    __updateTextures() {
        let flag = false;
        if (this.__colorTexture) {
            flag = true;
            this.__colorTexture.encoding = sRGBEncoding;
            this.__colorTexture.wrapS = this.__colorTexture.wrapT = RepeatWrapping;
            this.__colorTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__colorTexture.needsUpdate = true;
        }
        if (this.__normalTexture) {
            this.__normalTexture.encoding = sRGBEncoding;
            this.__normalTexture.wrapS = this.__normalTexture.wrapT = RepeatWrapping;
            this.__normalTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__normalTexture.needsUpdate = true;
        }

        if (this.__roughnessTexture) {
            this.__roughnessTexture.encoding = sRGBEncoding;
            this.__roughnessTexture.wrapS = this.__roughnessTexture.wrapT = RepeatWrapping;
            this.__roughnessTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__roughnessTexture.needsUpdate = true;
        }
        if (this.__ambientTexture) {
            this.__ambientTexture.encoding = sRGBEncoding;
            this.__ambientTexture.wrapS = this.__ambientTexture.wrapT = RepeatWrapping;
            this.__ambientTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__ambientTexture.needsUpdate = true;
        }
        if (this.__bumpTexture) {
            this.__bumpTexture.encoding = sRGBEncoding;
            this.__bumpTexture.wrapS = this.__bumpTexture.wrapT = RepeatWrapping;
            this.__bumpTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__bumpTexture.needsUpdate = true;
            this.displacementMap.needsUpdate = true;
        }
        if (flag) {
            this.needsUpdate = true;
            this.__scene.needsUpdate = true;
        }

    }

    __applyNewTextures() {
        if (this.__textureMapPack.colormap) {
            this.__colorTexture = new TextureLoader().load(this.__textureMapPack.colormap, this.__updateTextures.bind(this));
            this.map = this.__colorTexture;
        }
        if (this.__textureMapPack.normalmap) {
            this.__normalTexture = new TextureLoader().load(this.__textureMapPack.normalmap, this.__updateTextures.bind(this));
            this.normalMap = this.__normalTexture;
        }
        if (this.__textureMapPack.roughnessmap) {
            this.__roughnessTexture = new TextureLoader().load(this.__textureMapPack.roughnessmap, this.__updateTextures.bind(this));
            this.roughnessMap = this.__roughnessTexture;
        }
        if (this.__textureMapPack.ambientmap) {
            this.__ambientTexture = new TextureLoader().load(this.__textureMapPack.ambientmap, this.__updateTextures.bind(this));
            this.aoMap = this.__ambientTexture;
            this.aoMapIntensity = 1.0;
        }
        // if (this.__textureMapPack.bumpmap) {
        //     console.log('APPLY DISPLACEMENT MAP ::: ');
        //     this.__bumpTexture = new TextureLoader().load(this.__textureMapPack.bumpmap, this.__updateTextures.bind(this));
        //     this.displacementMap = this.__bumpTexture;
        //     this.displacementBias = -0.001;
        //     this.displacementScale = -100;
        // }
    }

    __scaleUV(uRatio, vRatio) {
        this.__uRatio = uRatio;
        this.__vRatio = vRatio;
        this.__updateTextures();
        this.needsUpdate = true;
        this.__scene.needsUpdate = true;
    }

    /**
     * 
     * @param {Number} x - Always implies the direction of the width 
     * @param {Number} y - Can be either length or height depending if wall or floor using this texture
     */
    __updateDimensions(width, height) {
        let ur = Math.max(width * this.__repeatPerCentimeter, 1.0);
        let vr = Math.max(height * this.__repeatPerCentimeter, 1.0);
        this.__scaleUV(ur, vr);
    }

    get textureMapPack() {
        return this.__textureMapPack;
    }

    set textureMapPack(textureMapPack) {
        this.__textureMapPack = textureMapPack;
        this.color = new Color(textureMapPack.color);
        this.roughness = (!textureMapPack.reflective) ? 0.5 : textureMapPack.reflective;
        this.__repeat = (!textureMapPack.repeat) ? TEXTURE_DEFAULT_REPEAT : textureMapPack.repeat;

        this.__repeatPerCentimeter = 1.0 / this.__repeat;
        this.__applyNewTextures();
    }

    get repeat() {
        return this.__repeat;
    }
    set repeat(value) {
        this.__repeat = value;
        this.__repeatPerCentimeter = 1.0 / this.__repeat;
        this.__updateDimensions(this.__dimensions.x, this.__dimensions.y);
    }

    get dimensions() {
        return this.__dimensions;
    }

    set dimensions(vec2) {
        this.__dimensions = vec2.clone();
        this.__updateDimensions(this.__dimensions.x, this.__dimensions.y);
    }

}