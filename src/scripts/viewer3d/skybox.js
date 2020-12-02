import { EventDispatcher, SphereGeometry, ShaderMaterial, Mesh, TextureLoader, Color, DoubleSide } from 'three';
import { AxesHelper } from 'three';
import { GridHelper } from 'three';
import { Configuration, gridSpacing } from '../core/configuration';
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

        this.sphereRadius = 4000;
        this.__gridSize = 10000;
        this.widthSegments = 32;
        this.heightSegments = 15;
        this.sky = null;

        this.plainVertexShader = ['varying vec3 vWorldPosition;', 'void main() {', 'vec4 worldPosition = modelMatrix * vec4( position, 1.0 );', 'vWorldPosition = worldPosition.xyz;', 'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );', '}'].join('\n');
        this.plainFragmentShader = ['uniform vec3 bottomColor;', 'uniform vec3 topColor;', 'uniform float offset;', 'uniform float exponent;', 'varying vec3 vWorldPosition;', 'void main() {', ' float h = normalize( vWorldPosition + offset ).y;', ' gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max(h, 0.0 ), exponent ), 0.0 ) ), 1.0 );', '}'].join('\n');

        this.vertexShader = ['varying vec2 vUV;', 'void main() {', '  vUV=uv;', '  vec4 pos = vec4(position, 1.0);', '   gl_Position = projectionMatrix * modelViewMatrix * pos;', '}'].join('\n');
        this.fragmentShader = ['uniform sampler2D texture;', 'varying vec2 vUV;', 'void main() {  ', 'vec4 sample = texture2D(texture, vUV);', 'gl_FragColor = vec4(sample.xyz, sample.w);', '}'].join('\n');

        this.texture = new TextureLoader();
        this.plainSkyMat = new ShaderMaterial({ vertexShader: this.plainVertexShader, fragmentShader: this.plainFragmentShader, uniforms: uniforms, side: DoubleSide });
        this.plainSkyMat.name = 'PlainSkyMaterial';
        this.skyMat = undefined;

        this.skyGeo = new SphereGeometry(this.sphereRadius, this.widthSegments, this.heightSegments);
        this.sky = new Mesh(this.skyGeo, this.skyMat);
        //		this.sky.position.x += this.sphereRadius*0.5;

        this.ground = new GridHelper(this.__gridSize, Math.round(this.__gridSize / Configuration.getNumericValue(gridSpacing)), 0x0F0F0F, 0x808080);
        this.ground.position.y = -10;

        this.scene.add(this.sky);
        this.scene.add(this.ground);

        let axesHelper = new AxesHelper(1000);
        this.scene.add(axesHelper);
        // axesHelper.visible = false;

        this.init();
        Configuration.getInstance().addEventListener(EVENT_CHANGED, this.__updateGrid.bind(this));
    }

    __updateGrid(evt) {
        this.scene.remove(this.ground);
        this.ground = new GridHelper(this.__gridSize, Math.round(this.__gridSize / Configuration.getNumericValue(gridSpacing)), 0x0F0F0F, 0x808080);
        this.ground.position.y = -10;
        this.scene.add(this.ground);
        this.scene.needsUpdate = true;
    }

    setEnabled(flag) {
        if (!flag) {
            this.scene.remove(this.sky);
            this.scene.remove(this.ground);
        } else {
            this.scene.add(this.sky);
            this.scene.add(this.ground);
        }
        //		this.sky.visible = this.ground.visible = flag;
    }

    toggleEnvironment(flag) {
        this.useEnvironment = flag;
        if (!flag) {
            this.ground.visible = true;
            this.sky.material = this.plainSkyMat;
            this.sky.material.needsUpdate = true;
        } else {
            this.ground.visible = false;
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