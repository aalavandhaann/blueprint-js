import {EventDispatcher} from 'three';
import {EVENT_UPDATED} from '../core/events.js';
import {Floor} from './floor.js';
import {Edge} from './edge.js';


export class Floorplan extends EventDispatcher
{
	constructor(scene, floorPlan, controls)
	{
		super();
		this.scene = scene;
		this.floorplan = floorPlan;
		this.controls = controls;
		this.floors = [];
		this.edges = [];
		var scope = this;
		// floorPlan.fireOnUpdatedRooms(redraw);
		this.updatedroomsevent = () => {scope.redraw();};
		this.floorplan.addEventListener(EVENT_UPDATED, this.updatedroomsevent);
	}
	
	redraw()
	{
		var scope = this;
		// clear scene
		this.floors.forEach((floor) => {
			floor.removeFromScene();
		});

		this.edges.forEach((edge) => {
			edge.remove();
		});
		this.floors = [];
		this.edges = [];

		// draw floors
		this.floorplan.getRooms().forEach((room) => {
			var threeFloor = new Floor(this.scene, room);
			this.floors.push(threeFloor);
			threeFloor.addToScene();
		});
		
		var eindex = 0;
		// draw edges
		this.floorplan.wallEdges().forEach((edge) => {
			var threeEdge = new Edge(scope.scene, edge, scope.controls);
			threeEdge.name = 'edge_'+eindex;
			eindex+=1;
			this.edges.push(threeEdge);
		});
	}
	
	showRoof(flag)
	{
		// draw floors
		this.floors.forEach((threeFloor) => {
			threeFloor.showRoof(flag);
		});
	}
}