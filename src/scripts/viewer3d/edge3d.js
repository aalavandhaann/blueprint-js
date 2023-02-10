import { EventDispatcher, Vector2, Vector3,MeshBasicMaterial, MeshStandardMaterial, FrontSide, DoubleSide, BackSide, Shape, Path, ShapeGeometry, Mesh, ExtrudeGeometry } from 'three';
// import { SubdivisionModifier } from 'three/examples/jsm/modifiers/SubdivisionModifier';
import { Utils } from '../core/utils.js';
import { EVENT_REDRAW, EVENT_UPDATE_TEXTURES, EVENT_DELETED, EVENT_MODIFY_TEXTURE_ATTRIBUTE, EVENT_CAMERA_ACTIVE_STATUS, EVENT_NEW_ITEM, EVENT_ITEM_REMOVED } from '../core/events.js';
import { WallMaterial3D } from '../materials/WallMaterial3D.js';
import { TEXTURE_PROPERTY_COLOR, TEXTURE_PROPERTY_REPEAT, TEXTURE_PROPERTY_ROTATE, TEXTURE_PROPERTY_REFLECTIVE, TEXTURE_PROPERTY_SHININESS } from '../core/constants.js';
import { BufferGeometry } from 'three';

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
        this.__baseBoardMesh = null;

        //Debug wall intersection planes. Edge.plane is the plane used for intersection
        //		this.phantomPlanes.push(this.edge.plane);//Enable this line to see the wall planes

        this.fillerColor = 0xC5C1B6; //0xdddddd;
        this.sideColor = 0xC5C1B6; //0xcccccc;
        this.baseColor = 0xC5C1B6; //0xdddddd;
        this.visible = false;

        this.redrawevent = this.__redraw.bind(this); //() => { scope.redraw(); };
        this.visibilityevent = this.__visibility.bind(this); //() => { scope.updateVisibility(); };
        this.showallevent = this.showAll.bind(this); //() => { scope.showAll(); };
        this.__edgeDeletedEvent = this.__edgeDeleted.bind(this);


        this.__updateTexturePackEvent = this.__updateTexturePack.bind(this);

        this.visibilityfactor = true;
        this.__wallMaterial3D = null;
        this.__baseBoardMaterial = new MeshStandardMaterial({color: 0xFFFFFF, side: DoubleSide});

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
            this.redraw(evt);
        }
        else if (evt.type === EVENT_MODIFY_TEXTURE_ATTRIBUTE) {
            if (this.__wallMaterial3D) {
                let attribute = evt.attribute;
                let value = evt.value;
                if (attribute === TEXTURE_PROPERTY_COLOR) {
                    this.__wallMaterial3D.textureColor = value;
                }
                if (attribute === TEXTURE_PROPERTY_REPEAT) {
                    this.__wallMaterial3D.repeat = value;
                }
                if (attribute === TEXTURE_PROPERTY_ROTATE) {
                    this.__wallMaterial3D.map.center=new Vector2(0.5,0.5);
                    this.__wallMaterial3D.map.rotation = value;
                    //this.__wallMaterial3D.normalMap.rotation = value;
                    //this.__wallMaterial3D.aoMap.rotation = value;
                    //this.__wallMaterial3D.roughnessMap.rotation = value; 
                }
                if (attribute === TEXTURE_PROPERTY_REFLECTIVE) {
                    this.__wallMaterial3D.reflective = value;
                }
                if (attribute === TEXTURE_PROPERTY_SHININESS) {
                    this.__wallMaterial3D.shininess = value;
                }
            }
        }
        this.scene.needsUpdate = true;
    }

    __edgeDeleted(evt) {
        this.remove();
    }

    __redraw(evt) {        
        this.redraw(evt);
    }

    __visibility() {
        this.updateVisibility();
    }

    __showAll() {
        this.updateVisibility();
    }

    init() {
        /**
         * Add the event listeners and they will take care of drawing the walls
         */
        if(!this.edge.hasEventListener(EVENT_DELETED, this.__edgeDeletedEvent)){
            this.edge.addEventListener(EVENT_DELETED, this.__edgeDeletedEvent);
            this.edge.addEventListener(EVENT_MODIFY_TEXTURE_ATTRIBUTE, this.__updateTexturePackEvent);
            this.edge.addEventListener(EVENT_UPDATE_TEXTURES, this.__updateTexturePackEvent);
            
            this.edge.addEventListener(EVENT_REDRAW, this.redrawevent);
            this.edge.addEventListener(EVENT_NEW_ITEM, this.redrawevent);
            this.edge.addEventListener(EVENT_ITEM_REMOVED, this.redrawevent);

            this.controls.addEventListener(EVENT_CAMERA_ACTIVE_STATUS, this.showallevent);
            this.controls.addEventListener('change', this.visibilityevent);
        }
    }

    redraw(evt) {
        if(!evt){
            throw new Error(`Event: ${evt} - is undefined. Only with certain events redraw calls are necessary.`);
        }
        this.removeFromScene();
        if(evt.type !== EVENT_NEW_ITEM && evt.type !== EVENT_ITEM_REMOVED){
            this.updateTexture(evt);
        }        
        this.updatePlanes();
        this.addToScene();
    }

    removeFromScene() {
        // if (this.wall.isLocked) {
        //     console.trace('REMOVE MYSELF FROM SCENE');
        // }
        let scope = this;
        scope.planes.forEach((plane) => {
            plane.geometry.dispose();
            scope.scene.remove(plane);
        });
        scope.basePlanes.forEach((plane) => {
            plane.geometry.dispose();
            scope.scene.remove(plane);
        });
        scope.phantomPlanes.forEach((plane) => {
            plane.geometry.dispose();
            scope.scene.remove(plane);
        });
        scope.planes.length = 0;
        scope.basePlanes.length = 0;
        scope.phantomPlanes.length = 0;
    }

    remove() {
        this.edge.removeEventListener(EVENT_DELETED, this.__edgeDeletedEvent);
        this.edge.removeEventListener(EVENT_MODIFY_TEXTURE_ATTRIBUTE, this.__updateTexturePackEvent);
        this.edge.removeEventListener(EVENT_UPDATE_TEXTURES, this.__updateTexturePackEvent);

        this.edge.removeEventListener(EVENT_REDRAW, this.redrawevent);
        this.edge.removeEventListener(EVENT_NEW_ITEM, this.redrawevent);
        this.edge.removeEventListener(EVENT_ITEM_REMOVED, this.redrawevent);
        
        this.controls.removeEventListener(EVENT_CAMERA_ACTIVE_STATUS, this.showallevent);
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
            //plane.visible = scope.visible;
        });

        // scope.wall.items.forEach((item) => {
        //     item.updateEdgeVisibility(scope.visible, scope.front);
        // });
        // scope.wall.onItems.forEach((item) => {
        //     item.updateEdgeVisibility(scope.visible, scope.front);
        // });

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
        let focus = new Vector3((start.x + end.x) * 0.5, 0, (start.y + end.y) * 0.5);
        let direction = position.sub(focus).normalize();

        // find dot
        let dot = normal.dot(direction);
        // update visible
        scope.visible = (dot >= 0);
        // show or hide planes
        scope.planes.forEach((plane) => {
            // plane.material.transparent = !scope.visible;
            // plane.material.opacity = (scope.visible) ? 1.0 : 0.001;
            // plane.visible = scope.visible;
            plane.material.visible=scope.visible;
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

    updateTexture(evt) {
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
            let exteriorWall = this.makeWall(exteriorStart, exteriorEnd, this.edge.exteriorTransform, this.edge.invExteriorTransform, this.__wallMaterial3D);
            exteriorWall.castShadow = true;
            this.planes.push(exteriorWall);
        }
        // interior plane
        // this.planes.push(this.makeWall(interiorStart, interiorEnd, this.edge.interiorTransform, this.edge.invInteriorTransform, wallMaterial));
        this.__wallPlaneMesh = this.makeWall(interiorStart, interiorEnd, this.edge.interiorTransform, this.edge.invInteriorTransform, this.__wallMaterial3D);
        this.planes.push(this.__wallPlaneMesh);
        // bottom
        // put into basePlanes since this is always visible
        this.basePlanes.push(this.buildFillerUniformHeight(this.edge, 0, BackSide, this.baseColor));
        this.planes.push(this.buildFillerVaryingHeights(this.edge, DoubleSide, this.fillerColor));

        // sides
        this.planes.push(this.buildSideFillter(this.edge.interiorStart(), this.edge.exteriorStart(), extStartCorner.elevation, this.sideColor));
        this.planes.push(this.buildSideFillter(this.edge.interiorEnd(), this.edge.exteriorEnd(), extEndCorner.elevation, this.sideColor));
    }

    // start, end have x and y attributes (i.e. corners)
    makeWall(start, end, transform, invTransform, material) {        
        let i;
        let totalDistance = this.edge.interiorDistance(); //Utils.distance(new Vector2(v1.x, v1.z), new Vector2(v2.x, v2.z));
        let height = Math.max(this.wall.startElevation, this.wall.endElevation);

        let v1 = this.toVec3(start, -5);
        let v2 = this.toVec3(end, -5);
        let v3 = this.toVec3(end, this.edge.getEnd().elevation + 1);//v2.clone();
        let v4 = this.toVec3(start, this.edge.getStart().elevation + 1);//v1.clone();
        
        let mesh = null;
        let points = null;
        let spoints = null;
        let shape = null;
        let geometry = null;

        let vertices = null;
        let normals = null;
        let uvs = null;

        let startToEnd = v2.clone().sub(v1);
        let topStartToBottomStart = v4.clone().sub(v1);
        let normal = (startToEnd).cross(topStartToBottomStart).normalize();


        points = [v1.clone(), v2.clone(), v3.clone(), v4.clone()];
        points.forEach((p) => {
            p = p.applyMatrix4(transform);
        });

        spoints = [
            new Vector2(points[0].x, points[0].y), new Vector2(points[1].x, points[1].y), 
            new Vector2(points[2].x, points[2].y), new Vector2(points[3].x, points[3].y)];
        shape = new Shape(spoints);
        //console.log("In Wall item Length",this.wall.inWallItems.length)
        // add holes for each wall item
        for (i = 0; i < this.wall.inWallItems.length; i++) {
            let item = this.wall.inWallItems[i];
            let pos = item.position.clone();
            let halfSize = item.halfSize.clone();
            let min = halfSize.clone().negate();
            let max = halfSize.clone();
            let holePoints = null;

            pos = pos.applyMatrix4(transform);
            min.add(pos);
            max.add(pos);
            holePoints = [new Vector2(min.x, min.y), new Vector2(max.x, min.y), new Vector2(max.x, max.y), new Vector2(min.x, max.y)];
            shape.holes.push(new Path(holePoints));
        }

        geometry = new ShapeGeometry(shape);
        vertices = geometry.getAttribute('position');
        normals = geometry.getAttribute('normal');
        uvs = geometry.getAttribute('uv');

        // make correct vertex positions and UVs
        for (i = 0; i < vertices.count; i++){
            let vertex = new Vector3(vertices.getX(i), vertices.getY(i), vertices.getZ(i));
            let uv = null;
            vertex.applyMatrix4(invTransform);
            vertices.setX(i, vertex.x);
            vertices.setY(i, vertex.y);
            vertices.setZ(i, vertex.z);

            uv = vertexToUv(vertex);

            uvs.setXY(i, uv.x, uv.y);
        }

        //Set the normals
        for (i = 0;i < normals.count;i++){
            normals.setX(i, normal.x);
            normals.setY(i, normal.y);
            normals.setZ(i, normal.z);
        }
        
        geometry.computeBoundingBox();
        geometry.normalizeNormals();

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;
        geometry.attributes.uv.needsUpdate = true;

        function vertexToUv(vertex) {
            let x = Utils.distance(new Vector2(v1.x, v1.z), new Vector2(vertex.x, vertex.z)) / totalDistance;
            let y = vertex.y / height;
            return new Vector2(x, y);
        }

        mesh = new Mesh(geometry, material);
        mesh.receiveShadow = true; // default was false
        mesh.castShadow = true;
        mesh.name = 'wall';
        return mesh;
    }

    buildSideFillter(p1, p2, height, color) {
        let points = [this.toVec3(p1), this.toVec3(p2), this.toVec3(p2, height), this.toVec3(p1, height)];
        let vertices = [];
        let faces = [];

        let geometry = new BufferGeometry();
        points.forEach((p) => {
            vertices.push(p);
        });
        
        faces.push(vertices[0], vertices[1], vertices[2]);
        faces.push(vertices[0], vertices[2], vertices[3]);
        geometry.setFromPoints(faces);
        let fillerMaterial = new MeshBasicMaterial({ color: color, side: DoubleSide });
        let filler = new Mesh(geometry, fillerMaterial);
        filler.castShadow = true;
        return filler;
    }

    buildFillerVaryingHeights(edge, side, color) {
        
        let a = this.toVec3(edge.exteriorStart(), this.edge.getStart().elevation);
        let b = this.toVec3(edge.exteriorEnd(), this.edge.getEnd().elevation);
        let c = this.toVec3(edge.interiorEnd(), this.edge.getEnd().elevation);
        let d = this.toVec3(edge.interiorStart(), this.edge.getStart().elevation);


        let fillerMaterial = new MeshBasicMaterial({ color: color, side: side });

        let vertices = [];
        let faces = [];
        let geometry = new BufferGeometry();
        
        vertices.push(a, b, c, d);
        faces.push(vertices[0], vertices[1], vertices[2]);
        faces.push(vertices[0], vertices[2], vertices[3]);
        geometry.setFromPoints(faces);

        let filler = new Mesh(geometry, fillerMaterial);
        filler.castShadow = true;
        return filler;
    }

    buildFillerUniformHeight(edge, height, side, color) {
        let points = [this.toVec2(edge.exteriorStart()), this.toVec2(edge.exteriorEnd()), this.toVec2(edge.interiorEnd()), this.toVec2(edge.interiorStart())];

        let fillerMaterial = new MeshBasicMaterial({ color: color, side: side });
        let shape = new Shape(points);
        let geometry = new ShapeGeometry(shape);
        let filler = new Mesh(geometry, fillerMaterial);
        filler.castShadow = true;
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