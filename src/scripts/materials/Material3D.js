import { MeshStandardMaterial, TextureLoader, RepeatWrapping, Color, Vector2, sRGBEncoding, CubeReflectionMapping } from 'three';
import { TEXTURE_DEFAULT_REPEAT } from '../core/constants';

export class Material3D extends MeshStandardMaterial {
    constructor(parameters, textureMapPack, scene, reflectsScene = false) {
        super(parameters);
        // console.log('BLENDING :: ',this.blending);
        this.__scene = scene;
        this.__reflectsScene = reflectsScene;
        this.__mirrorCamera = null;

        // this.roughness = (!textureMapPack.reflective) ? 0.5 : textureMapPack.reflective;
        this.__repeat = (!textureMapPack.repeat) ? TEXTURE_DEFAULT_REPEAT : textureMapPack.repeat;
        this.__repeatX = null;
        this.__repeatY = null;

        if (this.__reflectsScene) {
            this.__mirrorCamera = this.__scene.environmentCamera;
            this.envMap = this.__mirrorCamera.renderTarget.texture;
            this.envMap.mapping = CubeReflectionMapping;
        }
        this.__textureMapPack = textureMapPack;
        this.__uRatio = 1.0;
        this.__vRatio = 1.0;
        this.__dimensions = new Vector2();

        this.__repeatPerCentimeter = 1.0 / this.__repeat; //Repeat for every 'x' centimeters
        this.__repeatPerCentimeterX = null;
        this.__repeatPerCentimeterY = null;

        this.__colorTexture = null;
        this.__normalTexture = null;
        this.__roughnessTexture = null;
        this.__ambientTexture = null;
        this.__bumpTexture = null;
        this.__metalTexture = null;
        // this.__applyNewTextures();
        // this.normalScale.set(-10, 10);
        this.textureMapPack = textureMapPack;
    }

    __updateColorMap(texture) {
        if (this.__colorTexture) {
            this.__colorTexture.encoding = sRGBEncoding;
            this.__colorTexture.wrapS = this.__colorTexture.wrapT = RepeatWrapping;
            this.__colorTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__colorTexture.needsUpdate = true;
            this.map = this.__colorTexture;
        }
        this.__updateTextures();
    }

    __updateNormalMap(texture) {
        if (this.__normalTexture) {
            this.__normalTexture.encoding = sRGBEncoding;
            this.__normalTexture.wrapS = this.__normalTexture.wrapT = RepeatWrapping;
            this.__normalTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__normalTexture.needsUpdate = true;
            this.normalMap = this.__normalTexture;
        }
        this.__updateTextures();
    }

    __updateRoughnessMap(texture) {
        if (this.__roughnessTexture) {
            this.__roughnessTexture.encoding = sRGBEncoding;
            this.__roughnessTexture.wrapS = this.__roughnessTexture.wrapT = RepeatWrapping;
            this.__roughnessTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__roughnessTexture.needsUpdate = true;
            this.roughnessMap = this.__roughnessTexture;
        }
        this.__updateTextures();
    }

    __updateAmbientMap(texture) {
        if (this.__ambientTexture) {
            this.__ambientTexture.encoding = sRGBEncoding;
            this.__ambientTexture.wrapS = this.__ambientTexture.wrapT = RepeatWrapping;
            this.__ambientTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__ambientTexture.needsUpdate = true;
            this.aoMap = this.__ambientTexture;
            // this.aoMapIntensity = 1.0;
        }
        this.__updateTextures();
    }

    __updateMetallicMap(texture) {
        if (this.__metalTexture) {
            this.__metalTexture.encoding = sRGBEncoding;
            this.__metalTexture.wrapS = this.__metalTexture.wrapT = RepeatWrapping;
            this.__metalTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__metalTexture.needsUpdate = true;
            this.metalnessMap = this.__metalTexture;
        }
        this.__updateTextures();
    }

    __updateBumpMap(texture) {
        if (this.__bumpTexture) {
            this.__bumpTexture.encoding = sRGBEncoding;
            this.__bumpTexture.wrapS = this.__bumpTexture.wrapT = RepeatWrapping;
            this.__bumpTexture.repeat.set(this.__uRatio, this.__vRatio);
            this.__bumpTexture.needsUpdate = true;
            this.displacementMap = this.__bumpTexture;
            this.displacementMap.needsUpdate = true;
        }
        this.__updateTextures();
    }

    __updateTextures() {
        this.needsUpdate = true;
        this.__scene.needsUpdate = true;
    }

    __applyNewTextures() {
        this.map = this.__colorTexture = null;
        this.normalMap = this.__normalTexture = null;
        this.roughnessMap = this.__roughnessTexture = null;
        this.aoMap = this.__ambientTexture = null;
        this.metalnessMap = this.__metalTexture = null;
        this.displacementMap = this.__bumpTexture = null;


        if (this.__textureMapPack.colormap) {
            this.__colorTexture = new TextureLoader().load(this.__textureMapPack.colormap, this.__updateColorMap.bind(this));
        }
        if (this.__textureMapPack.normalmap) {
            this.__normalTexture = new TextureLoader().load(this.__textureMapPack.normalmap, this.__updateNormalMap.bind(this));
        }
        if (this.__textureMapPack.roughnessmap) {
            this.__roughnessTexture = new TextureLoader().load(this.__textureMapPack.roughnessmap, this.__updateRoughnessMap.bind(this));
        }
        if (this.__textureMapPack.ambientmap) {
            this.__ambientTexture = new TextureLoader().load(this.__textureMapPack.ambientmap, this.__updateAmbientMap.bind(this));
        }
        if (this.__textureMapPack.metalmap) {
            this.__metalTexture = new TextureLoader().load(this.__textureMapPack.metalmap, this.__updateMetallicMap.bind(this));
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
        
        this.__updateColorMap();
        this.__updateNormalMap();
        this.__updateRoughnessMap();
        this.__updateMetallicMap();
        this.__updateAmbientMap();
        this.__updateBumpMap();

        // this.__updateTextures();
        // this.needsUpdate = true;
        // this.__scene.needsUpdate = true;
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

    get envMapCamera() {
        return this.__mirrorCamera;
    }

    get textureMapPack() {
        return this.__textureMapPack;
    }

    set textureMapPack(textureMapPack) {
        this.__textureMapPack = textureMapPack;

        textureMapPack.color = textureMapPack.color || '#FFFFFF';
        textureMapPack.emissive = textureMapPack.emissive || '#000000';

        textureMapPack.reflective = textureMapPack.reflective || 0.5;
        textureMapPack.shininess = textureMapPack.shininess || 0.5;

        this.color = new Color(textureMapPack.color);
        this.emissive = new Color(textureMapPack.emissive);

        this.roughness = textureMapPack.reflective;
        this.metalness = textureMapPack.shininess;

        this.__repeat = (!textureMapPack.repeat) ? TEXTURE_DEFAULT_REPEAT : textureMapPack.repeat;
        this.__repeatPerCentimeter = 1.0 / this.__repeat;

        this.__repeatX = textureMapPack.repeatX || textureMapPack.repeat;
        this.__repeatY = textureMapPack.repeatY || textureMapPack.repeat;

        this.__repeatPerCentimeterX = 1.0 / this.__repeatX;
        this.__repeatPerCentimeterY = 1.0 / this.__repeatY;

        this.__applyNewTextures();
    }

    get repeat() {
            return this.__repeat;
        }
        // set repeat(value) {
        //     this.__repeat = value;
        //     this.__repeatPerCentimeter = 1.0 / this.__repeat;
        //     this.__updateDimensions(this.__dimensions.x, this.__dimensions.y);
        // }

    get dimensions() {
        return this.__dimensions;
    }

    set dimensions(vec2) {
        this.__dimensions = vec2.clone();
        this.__updateDimensions(this.__dimensions.x, this.__dimensions.y);
    }

    get isReflective() {
        return this.__reflectsScene;
    }

    get textureColor(){
        return this.__textureMapPack.color;
    }

    set textureColor(hexstring){
        this.__textureMapPack.color = hexstring;
        this.color = new Color(this.__textureMapPack.color);
    }
}