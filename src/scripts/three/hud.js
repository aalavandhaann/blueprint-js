import {EventDispatcher, Scene as ThreeScene, Geometry, Vector3, LineBasicMaterial, CylinderGeometry, MeshBasicMaterial, Mesh, SphereGeometry, Object3D, LineSegments} from 'three';

import {EVENT_ITEM_SELECTED, EVENT_ITEM_UNSELECTED} from '../core/events.js';

//As far as I understand the HUD is here to show a rotation control on every item
//If this idea is correct then it seriously sucks. A whole rendering to show just cones and lines as arrows?
export class HUD extends EventDispatcher
{
	constructor(three, scene)
	{
		super();
		this.three = three;
		if(!scene)
		{
			this.scene = new ThreeScene();
		}
			
		else
		{
			this.scene = scene;
		}
		
		this.selectedItem = null;
		
		this.rotating = false;
		this.mouseover = false;
		
		this.tolerance = 10;
		this.height = 5;
		this.distance = 20;
		
		this.color = '#ffffff';
		this.hoverColor = '#f1c40f';
		
		this.activeObject = null;
		
		var scope = this;
		this.itemselectedevent = (o) => {scope.itemSelected(o.item);};
		this.itemunselectedevent = () => {scope.itemUnselected();};
		
		this.init();
	}
	
	init() 
	{
//		this.three.itemSelectedCallbacks.add(itemSelected);
//		this.three.itemUnselectedCallbacks.add(itemUnselected);
		this.three.addEventListener(EVENT_ITEM_SELECTED, this.itemselectedevent);
		this.three.addEventListener(EVENT_ITEM_UNSELECTED, this.itemunselectedevent);
	}
	
	getScene() 
	{
		return this.scene;
	}

	getObject() 
	{
		return this.activeObject;
	}
	
	
	resetSelectedItem() 
	{
		this.selectedItem = null;
		if (this.activeObject) 
		{
			this.scene.remove(this.activeObject);
			this.activeObject = null;
		}
	}

	itemSelected(item) 
	{
		if (this.selectedItem != item) 
		{
			this.resetSelectedItem();
			if (item.allowRotate && !item.fixed) 
			{
				this.selectedItem = item;
				this.activeObject = this.makeObject(this.selectedItem);
				this.scene.add(this.activeObject);
			}
		}
	}

	itemUnselected() 
	{
		this.resetSelectedItem();
	}

	setRotating(isRotating) 
	{
		this.rotating = isRotating;
		this.setColor();
	}

	setMouseover(isMousedOver) 
	{
		this.mouseover = isMousedOver;
		this.setColor();
	}

	setColor() 
	{
		var scope = this;
		if (scope.activeObject) 
		{
			scope.activeObject.children.forEach((obj) => {obj.material.color.set(scope.getColor());});
		}
//		this.three.needsUpdate();
		scope.three.ensureNeedsUpdate();
	}

	getColor()
	{
		return (this.mouseover || this.rotating) ? this.hoverColor : this.color;
	}

	update() 
	{
		if (this.activeObject) 
		{
			this.activeObject.rotation.y = this.selectedItem.rotation.y;
			this.activeObject.position.x = this.selectedItem.position.x;
			this.activeObject.position.z = this.selectedItem.position.z;
		}
	}

	makeLineGeometry(item) 
	{
		var geometry = new Geometry();
		geometry.vertices.push(new Vector3(0, 0, 0),this.rotateVector(item));
		return geometry;
	}

	rotateVector(item) 
	{
		var vec = new Vector3(0, 0,Math.max(item.halfSize.x, item.halfSize.z) + 1.4 + this.distance);
		return vec;
	}

	makeLineMaterial() 
	{
		var mat = new LineBasicMaterial({color: this.getColor(),linewidth: 3});
		return mat;
	}

	makeCone(item) 
	{
		var coneGeo = new CylinderGeometry(5, 0, 10);
		var coneMat = new MeshBasicMaterial({color: this.getColor()});
		var cone = new Mesh(coneGeo, coneMat);
		cone.position.copy(this.rotateVector(item));
		cone.rotation.x = -Math.PI / 2.0;
		return cone;
	}

	makeSphere() 
	{
		var geometry = new SphereGeometry(4, 16, 16);
		var material = new MeshBasicMaterial({color: this.getColor()});
		var sphere = new Mesh(geometry, material);
		return sphere;
	}

	makeObject(item) 
	{
		var object = new Object3D();
		var line = new LineSegments(this.makeLineGeometry(item),this.makeLineMaterial(this.rotating));
		var cone = this.makeCone(item);
		var sphere = this.makeSphere(item);
		object.add(line);
		object.add(cone);
		object.add(sphere);
		object.rotation.y = item.rotation.y;
		object.position.x = item.position.x;
		object.position.z = item.position.z;
		object.position.y = this.height;
		return object;
	}
}