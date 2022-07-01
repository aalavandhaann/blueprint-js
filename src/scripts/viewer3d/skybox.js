import { EventDispatcher, SphereGeometry, ShaderMaterial, Mesh, TextureLoader, Color, DoubleSide } from 'three';
import { AxesHelper, GridHelper } from 'three';
import { Vector3 } from 'three';
import { Configuration, gridSpacing, viewBounds } from '../core/configuration';
import { EVENT_CHANGED } from '../core/events';

export class Skybox extends EventDispatcher {
    constructor(scene, renderer) {
        super();

        this.defaultEnvironment = 'rooms/textures/envs/Garden.png';
        this.useEnvironment = false;
        this.topColor = 0x92b2ce; //0xe9e9e9; //0xf9f9f9;//0x565e63
        this.bottomColor = 0xffffff; //0xD8ECF9
        this.verticalOffset = 400;
        this.exponent = 0.5;

        var uniforms = { topColor: { type: 'c', value: new Color(this.topColor) }, bottomColor: { type: 'c', value: new Color(this.bottomColor) }, offset: { type: 'f', value: this.verticalOffset }, exponent: { type: 'f', value: this.exponent } };

        this.scene = scene;
        this.renderer = renderer;

        this.sphereRadius = 1;
        this.__gridSize = Configuration.getNumericValue(viewBounds)*5.0;//10000;
        this.widthSegments = 32;
        this.heightSegments = 15;
        this.sky = null;

        this.__fineGridFloor = null;
        this.__coarseGridFloor = null;

        this.plainVertexShader = ['varying vec3 vWorldPosition;', 'void main() {', 'vec4 worldPosition = modelMatrix * vec4( position, 1.0 );', 'vWorldPosition = worldPosition.xyz;', 'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );', '}'].join('\n');
        this.plainFragmentShader = ['uniform vec3 bottomColor;', 'uniform vec3 topColor;', 'uniform float offset;', 'uniform float exponent;', 'varying vec3 vWorldPosition;', 'void main() {', ' float h = normalize( vWorldPosition + offset ).y;', ' gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max(h, 0.0 ), exponent ), 0.0 ) ), 1.0 );', '}'].join('\n');

        this.vertexShader = ['varying vec2 vUV;', 'void main() {', '  vUV=uv;', '  vec4 pos = vec4(position, 1.0);', '   gl_Position = projectionMatrix * modelViewMatrix * pos;', '}'].join('\n');
        this.fragmentShader = ['uniform sampler2D texture;', 'varying vec2 vUV;', 'void main() {  ', 'vec4 sample = texture2D(texture, vUV);', 'gl_FragColor = vec4(sample.xyz, sample.w);', '}'].join('\n');

        this.texture = new TextureLoader();
        this.plainSkyMat = new ShaderMaterial({ vertexShader: this.plainVertexShader, fragmentShader: this.plainFragmentShader, uniforms: uniforms, side: DoubleSide });
        this.plainSkyMat.name = 'PlainSkyMaterial';
        this.skyMat = undefined;

        this.skyGeo = new SphereGeometry(this.sphereRadius, this.widthSegments, this.heightSegments);
        this.sky = new Mesh(this.skyGeo, this.plainSkyMat);
        //		this.sky.position.x += this.sphereRadius*0.5;

        let axesHelper = new AxesHelper(1000);
        this.scene.add(axesHelper);
        this.scene.add(this.sky);
        // axesHelper.visible = false;

        this.__createGridFloors();
        this.init();
        Configuration.getInstance().addEventListener(EVENT_CHANGED, this.__updateGrid.bind(this));
    }

    __createGridFloors(){
        if(this.__fineGridFloor){
            this.scene.remove(this.__fineGridFloor);
            this.scene.remove(this.__coarseGridFloor);
        }
        this.__fineGridFloor = new GridHelper(this.__gridSize, Math.round(this.__gridSize / Configuration.getNumericValue(gridSpacing)), 0x0F0F0F, 0x808080);
        this.__coarseGridFloor = new GridHelper(this.__gridSize, Math.round(this.__gridSize / (Configuration.getNumericValue(gridSpacing)*5)), 0x0F0F0F, 0x303030);

        this.__fineGridFloor.position.y = this.__coarseGridFloor.position.y = -10;

        this.scene.add(this.__fineGridFloor);
        this.scene.add(this.__coarseGridFloor);
        
        this.scene.needsUpdate = true;
    }
    

    __updateGrid(evt) {
        this.__gridSize = Configuration.getNumericValue(viewBounds);//*5.0;//10000;
        this.sky.scale.set(this.__gridSize*0.5, this.__gridSize*0.5, this.__gridSize*0.5)
        this.__createGridFloors();
    }

    toggleEnvironment(flag) {
        this.useEnvironment = flag;
        if (!flag) {
            this.__fineGridFloor.visible = true;
            this.sky.material = this.plainSkyMat;
            this.sky.material.needsUpdate = true;
        } else {
            this.__fineGridFloor.visible = false;
            if (!this.skyMat) {
                this.setEnvironmentMap(this.defaultEnvironment);
            } else {
                this.sky.material = this.skyMat;
            }
            this.sky.visible = true;
        }
        this.scene.needsUpdate = true;
    }

    setEnvironmentMap(url) {
        var scope = this;
        scope.texture.load(url, function(t) {
            var textureUniform = { type: 't', value: t };
            var uniforms = { texture: textureUniform };
            scope.skyMat = new ShaderMaterial({ vertexShader: scope.vertexShader, fragmentShader: scope.fragmentShader, uniforms: uniforms, side: DoubleSide });
            scope.skyMat.name = 'SkyMaterial';
            scope.toggleEnvironment(scope.useEnvironment);
        }, undefined, function() {
            console.log('ERROR LOADEING FILE');
        });
    }

    init() {
        this.toggleEnvironment(false);
    }
}