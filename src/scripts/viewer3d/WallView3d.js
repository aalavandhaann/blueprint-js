import { BoxBufferGeometry, Mesh } from 'three';
import { Color, Vector2, Vector3 } from 'three';
import { MeshStandardMaterial, DoubleSide } from 'three';

import { EVENT_UPDATED } from '../core/events.js';

export class WallView3D extends Mesh {
    /* 
		@cornerModel: Corner
        @floorplan: Floorplan
        @floorplanView2D: FloorplanView2D
        @wallsImage: Texture <Image>
        
		WallView2D Mesh <Object3D>
		2D View drawing of a wall object
	*/
    constructor(wallModel, floorplanModel, floorplanView2D, dragcontrols) {
        super();
        /**
         * @property {String} name Name of this drawable entity
         * @type {String}
         **/
        this.name = wallModel.uuid;

        /**
         * @property {Wall} wall The abstract Wall entity that is purely a data model
         * @type {Wall}
         **/
        this.wall = wallModel;

        /**
         * @property {Floorplan} floorplan The abstract Floorplan entity that is purely a data model
         * @type {Floorplan}
         **/
        this.floorplan = floorplanModel;

        /**
         * @property {FloorView2D} viewparent The instance of three Group that is resposible for drawing this corner
         * @type {FloorView2D}
         **/
        this.viewparent = floorplanView2D;

        this.controls = dragcontrols;

        /**
         * @property {Vector2} unitvector A unit Vector2 instance
         * @type {Vector2}
         * @see https://threejs.org/docs/#api/en/geometries/Vector2
         **/
        this.unitvector = new Vector2(1, 0);
        this.edge = (this.wall.frontEdge) ? this.wall.frontEdge : (this.wall.backEdge) ? this.wall.backEdge : null;

        //The geometry shall be a unitvector in width
        let geometry = new BoxBufferGeometry(1, 1, wallModel.thickness);
        let color = new Color('#3C3C3C');
        let material = new MeshStandardMaterial({ color: color, emissive: color, roughness: 0, side: DoubleSide });
        this._viewentity = new Mesh(geometry, material);
        this.add(this._viewentity);
        this._viewentity.matrixAutoUpdate = false;
        this.drawUpdatedWall();

        let scope = this;
        this.controls.addEventListener('change', () => { scope.updateVisibility(); });
        // this.wall.addEventListener(EVENT_UPDATED, () => {
        //     scope.edge = (scope.wall.frontEdge) ? scope.wall.frontEdge : (scope.wall.backEdge) ? scope.wall.backEdge : null;
        //     scope.updateVisibility();
        //     scope.viewparent.scene.needsUpdate = true;
        //     scope.viewparent.render();
        // });
        this.updateVisibility();
    }

    updateVisibility() {
        var scope = this;
        if (scope.edge == null) {
            return;
        }
        // finds the normal from the specified edge
        var start = scope.edge.interiorStart();
        var end = scope.edge.interiorEnd();
        var x = end.x - start.x;
        var y = end.y - start.y;
        // rotate 90 degrees CCW
        var normal = new Vector3(-y, 0, x);
        normal.normalize();

        // setup camera: scope.controls.object refers to the camera of the scene
        var position = scope.viewparent.camera.position.clone();
        var focus = new Vector3((start.x + end.x) / 2.0, 0, (start.y + end.y) / 2.0);
        var direction = position.sub(focus).normalize();

        // find dot
        var dot = normal.dot(direction);
        // update visible
        let visible = (dot >= 0);
        scope.visible = visible;
        // scope._viewentity.visible = scope.visible;

        scope._viewentity.material.transparent = !visible;
        scope._viewentity.material.opacity = (visible) ? 1.0 : 0.1;
    }

    drawUpdatedWall() {
        //Drawing logic of 2d wall here

        //Calculate the vector between two corner locations
        let start = this.wall.start.location.clone();
        let end = this.wall.end.location.clone();
        let vect = end.clone().sub(start.clone());
        let halfVect = vect.clone().multiplyScalar(0.5);
        let pos = start.clone().add(halfVect);

        let angle = vect.angle();
        let sizeW = vect.length(); // + this.wall.thickness;
        this.position.set(pos.x, this.wall.averageHeight * 0.5, pos.y);
        this._viewentity.setRotationFromAxisAngle(new Vector3(0.0, 1.0, 0.0), angle);
        this._viewentity.scale.set(sizeW, this.wall.averageHeight, 1.0);
        this._viewentity.updateMatrix();
    }
}