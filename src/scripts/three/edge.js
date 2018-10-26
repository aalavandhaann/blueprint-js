import {EventDispatcher, TextureLoader, RepeatWrapping, Vector2, Vector3, MeshBasicMaterial, FrontSide, DoubleSide, BackSide, Shape, Path, ShapeGeometry, Mesh, Geometry, Face3} from 'three';
import {Utils} from '../core/utils.js';
import {EVENT_REDRAW, EVENT_CAMERA_MOVED} from '../core/events.js';

export class Edge extends EventDispatcher
{
	constructor(scene, edge, controls)
	{
		super();
		this.name = 'edge';
		this.scene = scene;
		this.edge = edge;
		this.controls = controls;
		
		this.wall = edge.wall;
		this.front = edge.front;

		this.planes = [];
		this.basePlanes = []; // always visible
		this.texture = new TextureLoader();
		
		this.lightMap = new TextureLoader().load('rooms/textures/walllightmap.png');
		this.fillerColor = 0xdddddd;
		this.sideColor = 0xcccccc;
		this.baseColor = 0xdddddd;
		this.visible = false;
		
		var scope = this;
		
		this.redrawevent = ()=>{scope.redraw();};
		this.visibilityevent = ()=>{scope.updateVisibility();};
		
		this.visibilityfactor = true;		
		this.init();
	}
	
	remove()
	{
// edge.redrawCallbacks.remove(redraw);
// controls.cameraMovedCallbacks.remove(updateVisibility);
		this.edge.removeEventListener(EVENT_REDRAW, this.redrawevent);
		this.controls.removeEventListener(EVENT_CAMERA_MOVED, this.visibilityevent);
		this.removeFromScene();
	}

	init()
	{
// edge.redrawCallbacks.add(redraw);
// controls.cameraMovedCallbacks.add(updateVisibility);
		
		this.edge.addEventListener(EVENT_REDRAW, this.redrawevent);
		this.controls.addEventListener(EVENT_CAMERA_MOVED, this.visibilityevent);
		
		this.updateTexture();
		this.updatePlanes();
		this.addToScene();
	}

	redraw() 
	{
		this.removeFromScene();
		this.updateTexture();
		this.updatePlanes();
		this.addToScene();
	}

	removeFromScene() 
	{
		var scope = this;
		scope.planes.forEach((plane) => {
			scope.scene.remove(plane);
		});
		scope.basePlanes.forEach((plane) => {
			scope.scene.remove(plane);
		});
		scope.planes = [];
		scope.basePlanes = [];
	}

	addToScene() 
	{
		var scope = this;
		this.planes.forEach((plane) => {
			scope.scene.add(plane);
		});
		this.basePlanes.forEach((plane) => {
			scope.scene.add(plane);
		});
		this.updateVisibility();
	}

	updateVisibility() 
	{
		var scope = this;
		// finds the normal from the specified edge
		var start = scope.edge.interiorStart();
		var end = scope.edge.interiorEnd();
		var x = end.x - start.x;
		var y = end.y - start.y;
		// rotate 90 degrees CCW
		var normal = new Vector3(-y, 0, x);
		normal.normalize();

		// setup camera: scope.controls.object refers to the camera of the scene
		var position = scope.controls.object.position.clone();
		var focus = new Vector3((start.x + end.x) / 2.0,0,(start.y + end.y) / 2.0);
		var direction = position.sub(focus).normalize();

		// find dot
		var dot = normal.dot(direction);

		// update visible
		scope.visible = (dot >= 0);
		
		// show or hide planes
		scope.planes.forEach((plane) => {
			plane.visible = scope.visible;
		});
		scope.updateObjectVisibility();
	}

	updateObjectVisibility() 
	{
		var scope = this;
		this.wall.items.forEach((item) => {
			item.updateEdgeVisibility(scope.visible, scope.front);
		});
		this.wall.onItems.forEach((item) => {
			item.updateEdgeVisibility(scope.visible, scope.front);
		});
	}

	updateTexture(callback)
	{
		var scope = this;
		// callback is fired when texture loads
		callback = callback || function () {scope.scene.needsUpdate = true;};
		var textureData = this.edge.getTexture();
		var stretch = textureData.stretch;
		var url = textureData.url;
		var scale = textureData.scale;		
		this.texture = new TextureLoader().load(url, callback);
		
		if (!stretch) 
		{
			var height = this.wall.height;
			var width = this.edge.interiorDistance();
			this.texture.wrapT = RepeatWrapping;
			this.texture.wrapS = RepeatWrapping;
			this.texture.repeat.set(width / scale, height / scale);
			this.texture.needsUpdate = true;
		}
	}

	updatePlanes() 
	{
		var wireframe = false;
		var color = 0xffffff;
		var wallMaterial = new MeshBasicMaterial({
			color: color,
			wireframe: wireframe,
			// ambientColor: 0xffffff, TODO_Ekki
			// ambient: scope.wall.color,
			side: FrontSide,
			map: this.texture,
			lightMap: this.lightMap,
		});

		var fillerMaterial = new MeshBasicMaterial({
			color: this.fillerColor,
			side: DoubleSide,
		});

		// exterior plane
		this.planes.push(this.makeWall(this.edge.exteriorStart(), this.edge.exteriorEnd(), this.edge.exteriorTransform, this.edge.invExteriorTransform, fillerMaterial));
		// interior plane
		this.planes.push(this.makeWall(this.edge.interiorStart(), this.edge.interiorEnd(), this.edge.interiorTransform, this.edge.invInteriorTransform, wallMaterial));
		// bottom
		// put into basePlanes since this is always visible
		this.basePlanes.push(this.buildFiller(this.edge, 0, BackSide, this.baseColor));
		// top
		this.planes.push(this.buildFiller(this.edge, this.wall.height, DoubleSide, this.fillerColor));
		// sides
		this.planes.push(this.buildSideFillter(this.edge.interiorStart(), this.edge.exteriorStart(), this.wall.height, this.sideColor));
		this.planes.push(this.buildSideFillter(this.edge.interiorEnd(), this.edge.exteriorEnd(), this.wall.height, this.sideColor));
	}

	// start, end have x and y attributes (i.e. corners)
	makeWall(start, end, transform, invTransform, material) 
	{
		var v1 = this.toVec3(start);
		var v2 = this.toVec3(end);
		var v3 = v2.clone();
		v3.y = this.wall.height;
		var v4 = v1.clone();
		v4.y = this.wall.height;

		var points = [v1.clone(), v2.clone(), v3.clone(), v4.clone()];

		points.forEach((p) => {p.applyMatrix4(transform);});
		
		var spoints = [new Vector2(points[0].x, points[0].y),new Vector2(points[1].x, points[1].y),new Vector2(points[2].x, points[2].y),new Vector2(points[3].x, points[3].y)]; 
		var shape = new Shape(spoints);

		// add holes for each wall item
		this.wall.items.forEach((item) => {
			var pos = item.position.clone();
			pos.applyMatrix4(transform);
			var halfSize = item.halfSize;
			var min = halfSize.clone().multiplyScalar(-1);
			var max = halfSize.clone();
			min.add(pos);
			max.add(pos);

			var holePoints = [new Vector2(min.x, min.y),new Vector2(max.x, min.y),new Vector2(max.x, max.y),new Vector2(min.x, max.y)];
			shape.holes.push(new Path(holePoints));
		});

		var geometry = new ShapeGeometry(shape);
		geometry.vertices.forEach((v) => {
			v.applyMatrix4(invTransform);
		});

		// make UVs
		var totalDistance = Utils.distance(new Vector2(v1.x, v1.z), new Vector2(v2.x, v2.z));
		var height = this.wall.height;
		geometry.faceVertexUvs[0] = [];

		geometry.faces.forEach((face) => {
			var vertA = geometry.vertices[face.a];
			var vertB = geometry.vertices[face.b];
			var vertC = geometry.vertices[face.c];
			geometry.faceVertexUvs[0].push([vertexToUv(vertA),vertexToUv(vertB),vertexToUv(vertC)]);
		});

		geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0];
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		
		function vertexToUv(vertex) 
		{
			var x = Utils.distance(new Vector2(v1.x, v1.z), new Vector2(vertex.x, vertex.z)) / totalDistance;
			var y = vertex.y / height;
			return new Vector2(x, y);
		}
		
		var mesh = new Mesh(geometry, material);
		mesh.name = this.name+'_plane';
		return mesh;
	}	

	buildSideFillter(p1, p2, height, color) 
	{
		var points = [this.toVec3(p1), this.toVec3(p2), this.toVec3(p2, height), this.toVec3(p1, height) ];

		var geometry = new Geometry();
		points.forEach((p) => {
			geometry.vertices.push(p);
		});
		geometry.faces.push(new Face3(0, 1, 2));
		geometry.faces.push(new Face3(0, 2, 3));

		var fillerMaterial = new MeshBasicMaterial({color: color,side: DoubleSide});
		var filler = new Mesh(geometry, fillerMaterial);
		return filler;
	}

	buildFiller(edge, height, side, color) 
	{
		var points = [this.toVec2(edge.exteriorStart()), this.toVec2(edge.exteriorEnd()), this.toVec2(edge.interiorEnd()),this.toVec2(edge.interiorStart())];

		var fillerMaterial = new MeshBasicMaterial({color: color,side: side});
		var shape = new Shape(points);
		var geometry = new ShapeGeometry(shape);
		var filler = new Mesh(geometry, fillerMaterial);
		filler.rotation.set(Math.PI / 2, 0, 0);
		filler.position.y = height;
		return filler;
	}

	toVec2(pos) 
	{
		return new Vector2(pos.x, pos.y);
	}

	toVec3(pos, height)
	{
		height = height || 0;
		return new Vector3(pos.x, height, pos.y);
	}
}