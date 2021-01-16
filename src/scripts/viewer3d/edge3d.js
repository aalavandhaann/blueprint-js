import { EventDispatcher, Vector2, Vector3, MeshBasicMaterial, FrontSide, DoubleSide, BackSide, Shape, Path, ShapeGeometry, Mesh, Geometry, Face3, Box3 } from 'three';
// import { SubdivisionModifier } from 'three/examples/jsm/modifiers/SubdivisionModifier';
import { Utils } from '../core/utils.js';
import { EVENT_REDRAW, EVENT_UPDATE_TEXTURES, EVENT_DELETED, EVENT_MODIFY_TEXTURE_ATTRIBUTE } from '../core/events.js';
import { WallMaterial3D } from '../materials/WallMaterial3D.js';
import { TEXTURE_PROPERTY_COLOR } from '../core/constants.js';

export class Edge3D extends EventDispatcher {
    constructor(scene, edge, controls, opts) {
        super();
        this.name = 'edge';
        this.scene = scene;
        this.edge = edge;
        this.controls = controls;

        let options = { occludedWalls: false };
        for (let opt in options) {
            if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
                options[opt] = opts[opt];
            }
        }

        this.__options = options;


        this.wall = edge.wall;
        this.front = edge.front;

        this.planes = [];
        this.phantomPlanes = [];
        this.basePlanes = []; // always visible

        this.__wallPlaneMesh = null;

        //Debug wall intersection planes. Edge.plane is the plane used for intersection
        //		this.phantomPlanes.push(this.edge.plane);//Enable this line to see the wall planes

        this.fillerColor = 0x000000; //0xdddddd;
        this.sideColor = 0x333333; //0xcccccc;
        this.baseColor = 0x666666; //0xdddddd;
        this.visible = false;

        this.redrawevent = this.__redraw.bind(this); //() => { scope.redraw(); };
        this.visibilityevent = this.__visibility.bind(this); //() => { scope.updateVisibility(); };
        this.showallevent = this.__showAll.bind(this); //() => { scope.showAll(); };
        this.__edgeDeletedEvent = this.__edgeDeleted.bind(this);


        this.__updateTexturePackEvent = this.__updateTexturePack.bind(this);

        this.visibilityfactor = true;
        this.__wallMaterial3D = null;

        this.__updateTexturePack({ type: EVENT_UPDATE_TEXTURES });

        this.init();
    }

    __updateTexturePack(evt) {
        if (evt.type === EVENT_UPDATE_TEXTURES) {
            let height = Math.max(this.wall.startElevation, this.wall.endElevation);
            let width = this.edge.interiorDistance();
            let texturePack = this.edge.getTexture();

            if (!this.__wallMaterial3D) {
                let side = (this.wall.isLocked || this.__options.occludedWalls) ? DoubleSide : FrontSide;
                if (!texturePack.color) {
                    texturePack.color = '#FF0000';
                }
                this.__wallMaterial3D = new WallMaterial3D({ color: texturePack.color, side: side, transparent: true, wireframe: false }, texturePack, this.scene);
            }
            this.__wallMaterial3D.textureMapPack = texturePack;
            this.__wallMaterial3D.dimensions = new Vector2(width, height);
            // this.__wallMaterial3D.updateDimensions(width, height);
            this.redraw();
        }
        else if(evt.type === EVENT_MODIFY_TEXTURE_ATTRIBUTE){
            if(this.__wallMaterial3D){
                let attribute = evt.attribute;
                let value = evt.value;
                if(attribute === TEXTURE_PROPERTY_COLOR){
                    this.__wallMaterial3D.textureColor = value;
                }
            }
        }
        this.scene.needsUpdate = true;
    }

    __edgeDeleted(evt) {
        this.remove();
    }

    __redraw() {
        this.redraw();
    }

    __visibility() {
        this.updateVisibility();
    }

    __showAll() {
        this.__showAll();
    }

    init() {
        this.edge.addEventListener(EVENT_DELETED, this.__edgeDeletedEvent);

        this.edge.addEventListener(EVENT_MODIFY_TEXTURE_ATTRIBUTE, this.__updateTexturePackEvent);
        this.edge.addEventListener(EVENT_UPDATE_TEXTURES, this.__updateTexturePackEvent);

        this.edge.addEventListener(EVENT_REDRAW, this.redrawevent);
        this.controls.addEventListener('change', this.visibilityevent);

        this.updateTexture();
        this.updatePlanes();
        this.addToScene();
    }

    redraw() {
        this.removeFromScene();
        this.updateTexture();
        this.updatePlanes();
        this.addToScene();
    }

    removeFromScene() {
        // if (this.wall.isLocked) {
        //     console.trace('REMOVE MYSELF FROM SCENE');
        // }
        let scope = this;
        scope.planes.forEach((plane) => {
            scope.scene.remove(plane);
        });
        scope.basePlanes.forEach((plane) => {
            scope.scene.remove(plane);
        });
        scope.phantomPlanes.forEach((plane) => {
            scope.scene.remove(plane);
        });
        scope.planes = [];
        scope.basePlanes = [];
    }

    remove() {
        this.edge.removeEventListener(EVENT_DELETED, this.__edgeDeletedEvent);
        this.edge.removeEventListener(EVENT_UPDATE_TEXTURES, this.__updateTexturePackEvent);
        this.edge.removeEventListener(EVENT_REDRAW, this.redrawevent);
        this.controls.removeEventListener('change', this.visibilityevent);
        this.removeFromScene();
    }

    addToScene() {
        let scope = this;
        this.planes.forEach((plane) => {
            scope.scene.add(plane);
        });
        this.basePlanes.forEach((plane) => {
            scope.scene.add(plane);
        });
        this.phantomPlanes.forEach((plane) => {
            scope.scene.add(plane);
        });
        this.updateVisibility();
    }

    showAll() {
        let scope = this;
        scope.visible = true;
        scope.planes.forEach((plane) => {
            plane.material.transparent = !scope.visible;
            plane.material.opacity = 1.0;
            plane.visible = scope.visible;
        });

        this.wall.items.forEach((item) => {
            item.updateEdgeVisibility(scope.visible, scope.front);
        });
        this.wall.onItems.forEach((item) => {
            item.updateEdgeVisibility(scope.visible, scope.front);
        });
    }

    switchWireframe(flag) {
        let scope = this;
        scope.visible = true;
        scope.planes.forEach((plane) => {
            plane.material.wireframe = flag;
        });
    }

    updateVisibility() {
        if (this.wall.isLocked || this.__options.occludedWalls) {
            return;
        }
        let scope = this;
        // finds the normal from the specified edge
        let start = scope.edge.interiorStart();
        let end = scope.edge.interiorEnd();
        let x = end.x - start.x;
        let y = end.y - start.y;
        // rotate 90 degrees CCW
        let normal = new Vector3(-y, 0, x);
        normal.normalize();

        // setup camera: scope.controls.object refers to the camera of the scene
        let position = scope.controls.object.position.clone();
        let focus = new Vector3((start.x + end.x) / 2.0, 0, (start.y + end.y) / 2.0);
        let direction = position.sub(focus).normalize();

        // find dot
        let dot = normal.dot(direction);
        // update visible
        scope.visible = (dot >= 0);
        // show or hide planes
        scope.planes.forEach((plane) => {
            // plane.material.transparent = !scope.visible;
            // plane.material.opacity = (scope.visible) ? 1.0 : 0.1;
            plane.visible = scope.visible;
        });
        scope.updateObjectVisibility();
    }

    updateObjectVisibility() {
        let scope = this;

        function itemVisibility(item, visibility) {
            if (scope.front) {
                item.frontVisible = visibility;
            } else {
                item.backVisible = visibility;
            }
            return (item.frontVisible || item.backVisible);
        }
        this.wall.inWallItems.forEach((item) => {
            let visibility = itemVisibility(item, scope.visible);
            item.visible = visibility;
        });
        this.wall.onWallItems.forEach((item) => {
            let visibility = itemVisibility(item, scope.visible);
            item.visible = visibility;
        });
    }

    updateTexture(callback) {
        if (this.edge === null) {
            return;
        }
        let height = Math.max(this.wall.startElevation, this.wall.endElevation);
        let width = this.edge.interiorDistance();
        this.__wallMaterial3D.dimensions = new Vector2(width, height);
        // this.__wallMaterial3D.updateDimensions(width, height);
    }

    updatePlanes() {
        let extStartCorner = this.edge.getStart();
        let extEndCorner = this.edge.getEnd();

        if (extStartCorner === null || extEndCorner === null) {
            return;
        }

        let interiorStart = this.edge.interiorStart();
        let interiorEnd = this.edge.interiorEnd();
        let exteriorStart = this.edge.exteriorStart();
        let exteriorEnd = this.edge.exteriorEnd();

        // exterior plane for real exterior walls
        //If the walls have corners that have more than one room attached
        //Then there is no need to construct an exterior wall
        if (this.edge.wall.start.getAttachedRooms().length < 2 || this.edge.wall.end.getAttachedRooms().length < 2) {
            // console.log('CONSTRUCT EXTERIOR WALLS');
            let exteriorWall = this.makeWall(exteriorStart, exteriorEnd, this.edge.exteriorTransform, this.edge.invExteriorTransform, this.__wallMaterial3D);
            this.planes.push(exteriorWall);
        }
        // interior plane
        // this.planes.push(this.makeWall(interiorStart, interiorEnd, this.edge.interiorTransform, this.edge.invInteriorTransform, wallMaterial));
        this.__wallPlaneMesh = this.makeWall(interiorStart, interiorEnd, this.edge.interiorTransform, this.edge.invInteriorTransform, this.__wallMaterial3D);
        this.planes.push(this.__wallPlaneMesh);
        // bottom
        // put into basePlanes since this is always visible
        this.basePlanes.push(this.buildFillerUniformHeight(this.edge, 0, BackSide, this.baseColor));
        // if (this.edge.wall.start.getAttachedRooms().length < 2 || this.edge.wall.end.getAttachedRooms().length < 2) {
        this.planes.push(this.buildFillerVaryingHeights(this.edge, DoubleSide, this.fillerColor));
        // }

        // sides
        this.planes.push(this.buildSideFillter(this.edge.interiorStart(), this.edge.exteriorStart(), extStartCorner.elevation, this.sideColor));
        this.planes.push(this.buildSideFillter(this.edge.interiorEnd(), this.edge.exteriorEnd(), extEndCorner.elevation, this.sideColor));
        //		this.planes.push(this.buildSideFillter(this.edge.interiorStart(), this.edge.exteriorStart(), this.wall.startElevation, this.sideColor));
        //		this.planes.push(this.buildSideFillter(this.edge.interiorEnd(), this.edge.exteriorEnd(), extEndCorner.endElevation, this.sideColor));
    }

    // start, end have x and y attributes (i.e. corners)
    makeWall(start, end, transform, invTransform, material) {
        let v1 = this.toVec3(start);
        let v2 = this.toVec3(end);
        let v3 = v2.clone();
        let v4 = v1.clone();
        v3.y = this.edge.getEnd().elevation;
        v4.y = this.edge.getStart().elevation;

        //		v3.y = this.wall.getClosestCorner(end).elevation;
        //		v4.y = this.wall.getClosestCorner(start).elevation;

        let points = [v1.clone(), v2.clone(), v3.clone(), v4.clone()];
        points.forEach((p) => {
            p.applyMatrix4(transform);
        });

        let spoints = [new Vector2(points[0].x, points[0].y), new Vector2(points[1].x, points[1].y), new Vector2(points[2].x, points[2].y), new Vector2(points[3].x, points[3].y)];
        let shape = new Shape(spoints);

        // add holes for each wall item
        for (let i = 0; i < this.wall.inWallItems.length; i++) {
            let item = this.wall.inWallItems[i];
            let pos = item.position.clone();
            let halfSize = item.halfSize.clone();
            let min = halfSize.clone().negate();
            let max = halfSize.clone();
            let holePoints = null;

            pos.applyMatrix4(transform);
            min.add(pos);
            max.add(pos);
            holePoints = [new Vector2(min.x, min.y), new Vector2(max.x, min.y), new Vector2(max.x, max.y), new Vector2(min.x, max.y)];
            shape.holes.push(new Path(holePoints));
        }

        let geometry = new ShapeGeometry(shape);
        geometry.vertices.forEach((v) => {
            v.applyMatrix4(invTransform);
        });

        // make UVs
        let totalDistance = this.edge.interiorDistance(); //Utils.distance(new Vector2(v1.x, v1.z), new Vector2(v2.x, v2.z));

        let height = Math.max(this.wall.startElevation, this.wall.endElevation);
        geometry.faceVertexUvs[0] = [];

        geometry.faces.forEach((face) => {
            let vertA = geometry.vertices[face.a];
            let vertB = geometry.vertices[face.b];
            let vertC = geometry.vertices[face.c];
            geometry.faceVertexUvs[0].push([vertexToUv(vertA), vertexToUv(vertB), vertexToUv(vertC)]);
        });

        geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0];
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

        function vertexToUv(vertex) {
            let x = Utils.distance(new Vector2(v1.x, v1.z), new Vector2(vertex.x, vertex.z)) / totalDistance;
            let y = vertex.y / height;
            return new Vector2(x, y);
        }

        // let subdivider = new SubdivisionModifier(3, true);
        // geometry = subdivider.modify(geometry);


        let mesh = new Mesh(geometry, material);
        mesh.name = 'wall';
        return mesh;
    }

    buildSideFillter(p1, p2, height, color) {
        let points = [this.toVec3(p1), this.toVec3(p2), this.toVec3(p2, height), this.toVec3(p1, height)];

        let geometry = new Geometry();
        points.forEach((p) => {
            geometry.vertices.push(p);
        });
        geometry.faces.push(new Face3(0, 1, 2));
        geometry.faces.push(new Face3(0, 2, 3));

        let fillerMaterial = new MeshBasicMaterial({ color: color, side: DoubleSide });
        let filler = new Mesh(geometry, fillerMaterial);
        return filler;
    }

    buildFillerVaryingHeights(edge, side, color) {
        let a = this.toVec3(edge.exteriorStart(), this.edge.getStart().elevation);
        let b = this.toVec3(edge.exteriorEnd(), this.edge.getEnd().elevation);
        let c = this.toVec3(edge.interiorEnd(), this.edge.getEnd().elevation);
        let d = this.toVec3(edge.interiorStart(), this.edge.getStart().elevation);


        let fillerMaterial = new MeshBasicMaterial({ color: color, side: side });

        let geometry = new Geometry();
        geometry.vertices.push(a, b, c, d);
        geometry.faces.push(new Face3(0, 1, 2));
        geometry.faces.push(new Face3(0, 2, 3));

        let filler = new Mesh(geometry, fillerMaterial);
        return filler;
    }

    buildFillerUniformHeight(edge, height, side, color) {
        let points = [this.toVec2(edge.exteriorStart()), this.toVec2(edge.exteriorEnd()), this.toVec2(edge.interiorEnd()), this.toVec2(edge.interiorStart())];

        let fillerMaterial = new MeshBasicMaterial({ color: color, side: side });
        let shape = new Shape(points);
        let geometry = new ShapeGeometry(shape);
        let filler = new Mesh(geometry, fillerMaterial);
        filler.rotation.set(Math.PI / 2, 0, 0);
        filler.position.y = height;
        return filler;
    }

    toVec2(pos) {
        return new Vector2(pos.x, pos.y);
    }

    toVec3(pos, height) {
        height = height || 0;
        return new Vector3(pos.x, height, pos.y);
    }
}