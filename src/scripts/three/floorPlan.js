import {EventDispatcher, Vector2} from 'three';
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
		
		function isUnique(gEdges, gStart, gEnd)
		{
			for (var i=0;i< gEdges.length;i++)
			{
				var cStart = gEdges[i][0];
				var cEnd = gEdges[i][1];
				var distance = cStart.distanceTo(gEnd) + cEnd.distanceTo(gStart);
				if(distance < 0.0000001)
				{
					return false;
				}
			}
			return true;
		}
		
//		console.log('TOTAL EDGES IN THIS FLOORPLAN :: ', this.floorplan.wallEdges().length);
		var tempEdges = [];
		var uniqueEdges = [];
		var eindex = 0;		
		// draw edges
		this.floorplan.wallEdges().forEach((edge) => {
			var gStart = new Vector2(edge.getStart().getX(), edge.getStart().getY());
			var gEnd = new Vector2(edge.getEnd().getX(), edge.getEnd().getY());
			if(isUnique(tempEdges, gStart, gEnd))
			{
				uniqueEdges.push(edge);
			}	
			var threeEdge = new Edge(scope.scene, edge, scope.controls);
			threeEdge.name = 'edge_'+eindex;
			this.edges.push(threeEdge);
			eindex+=1;
			tempEdges.push([gStart, gEnd]);
		});
		
//		console.log('TOTAL EDGES CONSTRUCTED ::: ', uniqueEdges.length);
	}
	
	showRoof(flag)
	{
		// draw floors
		this.floors.forEach((threeFloor) => {
			threeFloor.showRoof(flag);
		});
	}
}