import { EventDispatcher, HemisphereLight, DirectionalLight, AmbientLight, Vector3 } from 'three';
import { EVENT_UPDATED } from '../core/events.js';

export class Lights3D extends EventDispatcher {
    constructor(scene, floorplan) {
        super();
        this.scene = scene;
        this.floorplan = floorplan;
        this.tol = 1;
        this.height = 1000; // TODO: share with Blueprint.Wall
        this.dirLight = null;
        this.updatedroomsevent = () => { this.updateShadowCamera(); };
        this.init();
    }

    getDirLight() {
        return this.dirLight;
    }

    init() {
        var light = new HemisphereLight(0xffffff, 0x888888, 0.75);
        light.position.set(0, this.height, 0);

        this.dirLight = new DirectionalLight(0xffffff, 1.5);
        // this.dirLight.color.setHSL(1, 1, 0.1);

        this.ambLight = new AmbientLight(0x404040); // soft white light
        this.ambLight.intensity = 0.5;

        this.dirLight.castShadow = true;

        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;

        this.dirLight.shadow.camera.far = this.height + this.tol;
        this.dirLight.shadow.bias = -0.0001;
        this.dirLight.visible = true;
        this.dirLight.intensity = 0.15;

        this.scene.add(light);
        // this.scene.add(this.dirLight);
        // this.scene.add(this.dirLight.target);
        this.scene.add(this.ambLight);

        // this.floorplan.addEventListener(EVENT_UPDATED, this.updatedroomsevent);

    }

    updateShadowCamera() {
        var size = this.floorplan.getSize();
        var d = (Math.max(size.z, size.x) + this.tol) / 2.0;
        var center = this.floorplan.getCenter();
        var pos = new Vector3(center.x, this.height, center.z);
        this.dirLight.position.copy(pos);
        this.dirLight.target.position.copy(center);
        //dirLight.updateMatrix();
        //dirLight.updateWorldMatrix()
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        // this is necessary for updates
        if (this.dirLight.shadowCamera) {
            this.dirLight.shadow.camera.left = this.dirLight.shadowCameraLeft;
            this.dirLight.shadow.camera.right = this.dirLight.shadowCameraRight;
            this.dirLight.shadow.camera.top = this.dirLight.shadowCameraTop;
            this.dirLight.shadow.camera.bottom = this.dirLight.shadowCameraBottom;
            this.dirLight.shadowCamera.updateProjectionMatrix();
        }
    }
}