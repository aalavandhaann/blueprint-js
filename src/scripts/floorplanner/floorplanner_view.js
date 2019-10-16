import $ from 'jquery';
import {Vector2} from 'three';
import {WallTypes} from '../core/constants.js';
import {Utils} from '../core/utils.js';
import {EVENT_UPDATED} from '../core/events.js';

import {Dimensioning} from '../core/dimensioning.js';
import {Configuration, gridSpacing, configWallThickness, wallInformation} from '../core/configuration.js';
import {CarbonSheet} from './carbonsheet.js';

/** */
export const floorplannerModes = {MOVE: 0,DRAW: 1,DELETE: 2};

// grid parameters
//export const gridSpacing = Dimensioning.cmToPixel(25);//20; // pixels
export const gridWidth = 1;
export const gridColor = '#f1f1f1';

// room config
// export const roomColor = '#f9f9f9';
export const roomColor = '#fedaff66';
export const roomColorHover = '#008cba66';
export const roomColorSelected = '#00ba8c66';

// wall config
export var wallWidth = 5;
export var wallWidthHover = 7;
export var wallWidthSelected = 9;
export const wallColor = '#dddddd';
export const wallColorHover = '#008cba';
export const wallColorSelected = '#00ba8c';

export const edgeColor = '#888888';
export const edgeColorHover = '#008cba';
export const edgeWidth = 1;

export const deleteColor = '#ff0000';

// corner config
export const cornerRadius = 3;
export const cornerRadiusHover = 6;
export const cornerRadiusSelected = 9;
export const cornerColor = '#cccccc';
export const cornerColorHover = '#008cba';
export const cornerColorSelected = '#00ba8c';
/**
 * The View to be used by a Floorplanner to render in/interact with.
 */
export class FloorplannerView2D
{
	constructor(floorplan, viewmodel, canvas)
	{
		this.canvasElement = document.getElementById(canvas);
		this.canvas = canvas;
		this.context = this.canvasElement.getContext('2d');
		this.floorplan = floorplan;
		this.viewmodel = viewmodel;

		var scope = this;
		this._carbonsheet = new CarbonSheet(floorplan, viewmodel, canvas);
		this._carbonsheet.addEventListener(EVENT_UPDATED, function()
				{
					scope.draw();
				});

		this.floorplan.carbonSheet = this._carbonsheet;

		$(window).resize(() => {scope.handleWindowResize();});
		$(window).on('orientationchange', () => {scope.orientationChange();});
		this.handleWindowResize();
	}

	get carbonSheet()
	{
		return this._carbonsheet;
	}
	
	orientationChange()
	{
		this.handleWindowResize();
	}

	/** */
	handleWindowResize()
	{
		var canvasSel = $('#' + this.canvas);
		var parent = canvasSel.parent();
		
		parent.css({width: window.innerWidth, height: window.innerHeight});
		
		var w = window.innerWidth;//parent.innerWidth();
		var h = window.innerHeight;//parent.innerHeight();
		
//		console.log(window.innerWidth, window.innerHeight);
//		console.log(w, h);
		
		canvasSel.height(h);
		canvasSel.width(w);
		this.canvasElement.height = h;
		this.canvasElement.width = w;
		
		this.draw();
	}

	/** */
	draw()
	{
		wallWidth = Dimensioning.cmToPixel(Configuration.getNumericValue(configWallThickness));
		wallWidthHover = Dimensioning.cmToPixel(Configuration.getNumericValue(configWallThickness))*0.7;
		wallWidthSelected = Dimensioning.cmToPixel(Configuration.getNumericValue(configWallThickness))*0.9;
		
		this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
		
		this._carbonsheet.draw();
		this.drawGrid();
		this.drawOriginCrossHair();

		// this.context.globalAlpha = 0.3;
		this.floorplan.getRooms().forEach((room) => {this.drawRoom(room);});
		// this.context.globalAlpha = 1.0;

		this.floorplan.getWalls().forEach((wall) => {this.drawWall(wall);});
		this.floorplan.getCorners().forEach((corner) => {
			this.drawCorner(corner);
//			this.drawCornerAngles(corner);
			});
		
		// this.context.globalAlpha = 0.3;
//		this.floorplan.getRooms().forEach((room) => {this.drawRoom(room);});
		// this.context.globalAlpha = 1.0;
		
		if (this.viewmodel.mode == floorplannerModes.DRAW)
		{
			this.drawTarget(this.viewmodel.targetX, this.viewmodel.targetY, this.viewmodel.lastNode);
			//Enable the below lines for measurement while drawing, still needs work as it is crashing the whole thing
			if(this.viewmodel.lastNode != null && this.viewmodel.lastNode != undefined)
			{
				var a = new Vector2(this.viewmodel.lastNode.x,this.viewmodel.lastNode.y);
				var b = new Vector2(this.viewmodel.targetX, this.viewmodel.targetY);
				var abvector = b.clone().sub(a);
				var midPoint = abvector.multiplyScalar(0.5).add(a);
				this.drawTextLabel(Dimensioning.cmToMeasure(a.distanceTo(b)), this.viewmodel.convertX(midPoint.x), this.viewmodel.convertY(midPoint.y));
				
				//Show angle to the nearest wall
				var vector = b.clone().sub(a);
				var sAngle = (vector.angle()*180) / Math.PI;
				var result = this.viewmodel.lastNode.closestAngle(sAngle);				
				var eAngle = result['angle'];
				var closestVector = result['point'].sub(a);
				
				var textDistance = 60;
				var radius = Math.min(textDistance, vector.length());
//				radius = Math.max(radius, )
				var location = vector.normalize().add(closestVector.normalize()).multiplyScalar(textDistance).add(a);
				
				var ox = this.viewmodel.convertX(this.viewmodel.lastNode.x);
				var oy = this.viewmodel.convertY(this.viewmodel.lastNode.y);
				var angle = Math.abs(eAngle - sAngle);
				angle = (angle > 180) ? 360 - angle : angle;
				angle = Math.round(angle * 10) / 10;				
				
				sAngle = (sAngle * Math.PI) / 180;
				eAngle = (eAngle * Math.PI) / 180;				
				
				this.context.strokeStyle = '#FF0000';
				this.context.lineWidth = 4;
				this.context.beginPath();
				this.context.arc(ox, oy, radius*0.5, Math.min(sAngle, eAngle), Math.max(sAngle, eAngle), false);
				this.context.stroke();
				this.drawTextLabel(`${angle}°`, this.viewmodel.convertX(location.x), this.viewmodel.convertY(location.y));
			}
		}
		this.floorplan.getWalls().forEach((wall) => {this.drawWallLabels(wall);});
		if(this.viewmodel._clickedWallControl != null)
		{
			this.drawCircle(this.viewmodel.convertX(this.viewmodel._clickedWallControl.x), this.viewmodel.convertY(this.viewmodel._clickedWallControl.y), 7, '#F7F7F7');
		}
	}
	
	/**
	 * @depreceated
	 */
	zoom()
	{
		var originx = this.viewmodel.canvasElement.innerWidth() / 2.0;
		var originy = this.viewmodel.canvasElement.innerHeight() / 2.0;
		
		if(Configuration.getNumericValue('scale') != 1)
		{
			this.context.setTransform(1, 0, 0, 1, 0, 0);
			this.context.translate(originx, originy);
			this.context.scale(Configuration.getNumericValue('scale'), Configuration.getNumericValue('scale'));
			this.context.translate(-originx, -originy);
		}		
		else
		{
//			this.context.restore();
			this.context.setTransform(1, 0, 0, 1, 0, 0);
		}
		this.draw();
	}
	
	drawCornerAngles(corner)
	{
		var ox = this.viewmodel.convertX(corner.location.x);
		var oy = this.viewmodel.convertY(corner.location.y);
		var offsetRatio = 2.0;
		for (var i=0;i<corner.angles.length;i++)
		{
			var direction = corner.angleDirections[i];
			var location = direction.clone().add(corner.location);
			var sAngle = (corner.startAngles[i]*Math.PI)/180;
			var eAngle = (corner.endAngles[i]*Math.PI)/180;
			var angle = corner.angles[i];
			var lx = this.viewmodel.convertX(location.x);
			var ly = this.viewmodel.convertY(location.y);
			var radius = direction.length() * offsetRatio * 0.5;
			if( angle > 130 || angle == 0)
			{
				continue;
			}
			var ccwise = (Math.abs(corner.startAngles[i] - corner.endAngles[i]) > 180);			
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 4;
			this.context.beginPath();
			if(angle == 90)
			{
				var location2 = direction.clone().multiplyScalar(offsetRatio).add(corner.location);
				var lxx = this.viewmodel.convertX(location2.x);
				var lyy = this.viewmodel.convertY(location2.y);
				var b = {x:lxx, y:oy};
				var c = {x:lxx, y:lyy};
				var d = {x:ox, y:lyy};
				this.drawLine(b.x,b.y,c.x,c.y,this.context.lineWidth,this.context.strokeStyle);
				this.drawLine(c.x,c.y,d.x,d.y,this.context.lineWidth,this.context.strokeStyle);
			}
			else
			{
				this.context.arc(ox, oy, radius, Math.min(sAngle, eAngle), Math.max(sAngle, eAngle), ccwise);
			}
			
			this.context.stroke();
//			this.drawCircle(this.viewmodel.convertX(location.x), this.viewmodel.convertY(location.y), 7, '#000000');
			this.drawTextLabel(`${angle}°`, lx, ly);
		}
		
	}

	drawOriginCrossHair()
	{
		var ox = this.viewmodel.convertX(0);
		var oy = this.viewmodel.convertY(0);
		
		//draw origin crosshair
		this.context.fillStyle = '#0000FF';
		this.context.fillRect(ox-2, oy-7.5, 4, 15);
		this.context.fillRect(ox-7.5, oy-2, 15, 4);
		this.context.strokeStyle = '#FF0000';
		this.context.fillRect(ox-1.25, oy-5, 2.5, 10);
		this.context.fillRect(ox-5, oy-1.25, 10, 2.5);
	}

	/** */
	drawWallLabels(wall)
	{
		// we'll just draw the shorter label... idk
		if (wall.backEdge && wall.frontEdge)
		{
			if (wall.backEdge.interiorDistance() < wall.frontEdge.interiorDistance())
			{
				this.drawEdgeLabel(wall.backEdge);
				this.drawEdgeLabelExterior(wall.backEdge);
			}
			else
			{
				this.drawEdgeLabel(wall.frontEdge);
				this.drawEdgeLabelExterior(wall.frontEdge);
			}
		}
		else if (wall.backEdge)
		{
			this.drawEdgeLabel(wall.backEdge);
			this.drawEdgeLabelExterior(wall.backEdge);
		}
		else if (wall.frontEdge)
		{
			this.drawEdgeLabel(wall.frontEdge);
			this.drawEdgeLabelExterior(wall.frontEdge);
		}
		this.drawWallLabelsMiddle(wall);
	}

	drawWallLabelsMiddle(wall)
	{
		if(! wallInformation.midline)
		{
			return;
		}
		var pos = wall.wallCenter();
		var length = wall.wallLength();
		if (length < 60)
		{
			// dont draw labels on walls this short
			return;
		}
		var label = (!wallInformation.labels)?'':wallInformation.midlinelabel;
		this.drawTextLabel(`${label}${Dimensioning.cmToMeasure(length)}` ,this.viewmodel.convertX(pos.x),this.viewmodel.convertY(pos.y));
	}

	/** */
	drawEdgeLabelExterior(edge)
	{
		var pos = edge.exteriorCenter();
		var length = edge.exteriorDistance();
		if (length < 60)
		{
			// dont draw labels on walls this short
			return;
		}
		if(wallInformation.exterior)
		{
			var label = (!wallInformation.labels)?'':wallInformation.exteriorlabel;
			this.drawTextLabel(`${label}${Dimensioning.cmToMeasure(length)}` ,this.viewmodel.convertX(pos.x),this.viewmodel.convertY(pos.y+40));
		}
	}

	/** */
	drawEdgeLabel(edge)
	{
		var pos = edge.interiorCenter();
		var length = edge.interiorDistance();
		if (length < 60)
		{
			// dont draw labels on walls this short
			return;
		}
		if(wallInformation.interior)
		{
			var label = (!wallInformation.labels)?'':wallInformation.interiorlabel;
			this.drawTextLabel(`${label}${Dimensioning.cmToMeasure(length)}` ,this.viewmodel.convertX(pos.x),this.viewmodel.convertY(pos.y-40));
		}
		
	}

	drawTextLabel(label, x, y, textcolor='#000000', strokecolor='#ffffff', style='normal')
	{
		this.context.font = `${style} 12px Arial`;
		this.context.fillStyle = textcolor;
		this.context.textBaseline = 'middle';
		this.context.textAlign = 'center';
		this.context.strokeStyle = strokecolor;
		this.context.lineWidth = 4;
		this.context.strokeText(label,x,y);
		this.context.fillText(label,x,y);
	}

	/** */
	drawEdge(edge, hover, curved=false)
	{
		var color = edgeColor;
		if (hover && this.viewmodel.mode == floorplannerModes.DELETE)
		{
			color = deleteColor;
		}
		else if (hover)
		{
			color = edgeColorHover;
		}
		var corners = edge.corners();
		var scope = this;
		if(!curved)
		{
			this.drawPolygon(
					Utils.map(corners, function (corner) 
					{
						return scope.viewmodel.convertX(corner.x);
					}),
					Utils.map(corners, function (corner) 
							{
								return scope.viewmodel.convertY(corner.y);
							}),false,null,true,color,edgeWidth);
		}
//		else
//		{
//			this.drawPolygonCurved(edge.curvedCorners(),false,null,true,color,edgeWidth);
//		}
		
	}
	
	/** */
	drawWall(wall)
	{
		var selected = (wall === this.viewmodel.selectedWall);
		var hover = (wall === this.viewmodel.activeWall && wall != this.viewmodel.selectedWall);
		var color = wallColor;
		
		if (hover && this.viewmodel.mode == floorplannerModes.DELETE)
		{
			color = deleteColor;
		}				
		else if (hover)
		{
			color = wallColorHover;
		}
		
		else if(selected)
		{
			color = wallColorSelected;
		}
		var isCurved = (wall.wallType == WallTypes.CURVED);
		if(wall.wallType == WallTypes.CURVED && selected)
		{
//			this.drawCircle(this.viewmodel.convertX(wall.start.x), this.viewmodel.convertY(wall.start.y), 10, '#AAAAAA');
//			this.drawCircle(this.viewmodel.convertX(wall.end.x), this.viewmodel.convertY(wall.end.y), 10, '#000000');
			
//			this.drawCircle(this.viewmodel.convertX(wall.a.x), this.viewmodel.convertY(wall.a.y), 10, '#ff8cd3');
//			this.drawCircle(this.viewmodel.convertX(wall.b.x), this.viewmodel.convertY(wall.b.y), 10, '#eacd28');
			
			this.drawLine(this.viewmodel.convertX(wall.getStartX()),this.viewmodel.convertY(wall.getStartY()),this.viewmodel.convertX(wall.a.x),this.viewmodel.convertY(wall.a.y),5,'#006600');
			this.drawLine(this.viewmodel.convertX(wall.a.x),this.viewmodel.convertY(wall.a.y),this.viewmodel.convertX(wall.b.x),this.viewmodel.convertY(wall.b.y),5,'#006600');
			this.drawLine(this.viewmodel.convertX(wall.b.x),this.viewmodel.convertY(wall.b.y),this.viewmodel.convertX(wall.getEndX()),this.viewmodel.convertY(wall.getEndY()),5,'#06600');
			
			this.drawLine(this.viewmodel.convertX(wall.getStartX()),this.viewmodel.convertY(wall.getStartY()),this.viewmodel.convertX(wall.a.x),this.viewmodel.convertY(wall.a.y),1,'#00FF00');
			this.drawLine(this.viewmodel.convertX(wall.a.x),this.viewmodel.convertY(wall.a.y),this.viewmodel.convertX(wall.b.x),this.viewmodel.convertY(wall.b.y),1,'#00FF00');
			this.drawLine(this.viewmodel.convertX(wall.b.x),this.viewmodel.convertY(wall.b.y),this.viewmodel.convertX(wall.getEndX()),this.viewmodel.convertY(wall.getEndY()),1,'#00FF00');
			
			this.drawCircle(this.viewmodel.convertX(wall.a.x), this.viewmodel.convertY(wall.a.y), 10, '#D7D7D7');
			this.drawCircle(this.viewmodel.convertX(wall.b.x), this.viewmodel.convertY(wall.b.y), 10, '#D7D7D7');
		}
		
		if(wall.wallType == WallTypes.STRAIGHT)
		{
			this.drawLine(this.viewmodel.convertX(wall.getStartX()),this.viewmodel.convertY(wall.getStartY()),this.viewmodel.convertX(wall.getEndX()),this.viewmodel.convertY(wall.getEndY()),hover ? wallWidthHover : selected ? wallWidthSelected : wallWidth,color);
		}
		else
		{
//			var p = {x: this.viewmodel.mouseX, y: this.viewmodel.mouseY};
//			var project = wall.bezier.project(p);
//			this.drawBezierObject(wall.bezier, 10, '#FF0000');
//			this.drawBezierObject(wall.bezier.offset(wall.thickness*0.5)[0], 3, '#F0F0F0');
//			this.drawBezierObject(wall.bezier.offset(-wall.thickness*0.5)[0], 3, '#0F0F0F');
			
			this.drawCurvedLine(
					this.viewmodel.convertX(wall.getStartX()),
					this.viewmodel.convertY(wall.getStartY()),
					
					this.viewmodel.convertX(wall.a.x),
					this.viewmodel.convertY(wall.a.y),
					
					this.viewmodel.convertX(wall.b.x),
					this.viewmodel.convertY(wall.b.y),
					
					this.viewmodel.convertX(wall.getEndX()),
					this.viewmodel.convertY(wall.getEndY()),
					hover ? wallWidthHover : selected ? wallWidthSelected : wallWidth,color);
			
//			this.drawLine(this.viewmodel.convertX(project.x),this.viewmodel.convertY(project.y),this.viewmodel.convertX(p.x),this.viewmodel.convertY(p.y), 1, '#ff0000');
		}
		
		if (!hover && !selected && wall.frontEdge)
		{
			this.drawEdge(wall.frontEdge, hover, isCurved);
		}
		if (!hover && !selected && wall.backEdge)
		{
			this.drawEdge(wall.backEdge, hover, isCurved);
		}
		
		if(selected)
		{			
			if(wall.wallType != WallTypes.CURVED)
			{
				this.drawCornerAngles(wall.start);
				this.drawCornerAngles(wall.end);
			}
		}
		this.drawCircle(this.viewmodel.canvasElement.innerWidth() / 2.0, this.viewmodel.canvasElement.innerHeight() / 2.0, 3, '#FF0000');
	}

	/** */
	drawRoom(room)
	{
//		var scope = this;
		var selected = (room === this.viewmodel.selectedRoom);
		var hover = (room === this.viewmodel.activeRoom && room != this.viewmodel.selectedRoom);
		var color = roomColor;
		if (hover)
		{
			color = roomColorHover;
		}
		else if (selected)
		{
			color = roomColorSelected;
		}
//		this.drawPolygon(
//				Utils.map(room.corners, (corner) => 
//				{
//					return scope.viewmodel.convertX(corner.x);
//				}),
//				Utils.map(room.corners, (corner) =>  
//				{
//					return scope.viewmodel.convertY(corner.y);
//				}), 
//				true, color);
		
		var polygonPoints = [];
		
		for (var i=0;i<room.roomCornerPoints.length;i++)
		{
			polygonPoints.push([room.roomCornerPoints[i]]);
		}
		
		this.drawPolygonCurved(polygonPoints, true, color);
		
		this.drawTextLabel(Dimensioning.cmToMeasure(room.area, 2)+String.fromCharCode(178), this.viewmodel.convertX(room.areaCenter.x), this.viewmodel.convertY(room.areaCenter.y), '#0000FF', '#00FF0000', 'bold');
		this.drawTextLabel(room.name, this.viewmodel.convertX(room.areaCenter.x), this.viewmodel.convertY(room.areaCenter.y+30), '#363636', '#00FF0000', 'bold italic');
		
//		Debuggin Room for correct order of polygon points with room walls
//		if(selected)
//		{
//			for (i=0;i<room.roomCornerPoints.length;i++)
//			{
//				var p = room.roomCornerPoints[i];
////				this.drawCircle(this.viewmodel.convertX(p.x), this.viewmodel.convertY(p.y), 6, '#999999');
//				this.drawTextLabel(`p:${i+0}`, this.viewmodel.convertX(p.x), this.viewmodel.convertY(p.y), '#363636', '#00FF0000', 'bold italic');
//			}
//		}
	}

	/** */
	drawCorner(corner)
	{
		var cornerX = this.viewmodel.convertX(corner.x);
		var cornerY = this.viewmodel.convertY(corner.y);
		var hover = (corner === this.viewmodel.activeCorner && corner != this.viewmodel.selectedCorner);
		var selected = (corner === this.viewmodel.selectedCorner);
		var color = cornerColor;
		if (hover && this.viewmodel.mode == floorplannerModes.DELETE)
		{
			color = deleteColor;
		}
		else if (hover)
		{
			color = cornerColorHover;
		}
		else if (selected)
		{
			color = cornerColorSelected;
		}
		
		if(selected)
		{
			this.drawCornerAngles(corner);
			corner.adjacentCorners().forEach((neighbour) => 
			{
				this.drawCornerAngles(neighbour);
			});
		}
		
		this.drawCircle(cornerX, cornerY, hover ? cornerRadiusHover : selected ? cornerRadiusSelected : cornerRadius, color);
		// let cx = Dimensioning.roundOff(corner.x, 10);
		// let cy = Dimensioning.roundOff(corner.y, 10);
		// var cornerLabel = `(${cx}, ${cy})`;
		// this.drawTextLabel(cornerLabel, cornerX, cornerY);
	}

	/** */
	drawTarget(x, y, lastNode)
	{
		this.drawCircle(this.viewmodel.convertX(x),this.viewmodel.convertY(y),cornerRadiusHover,cornerColorHover);
		if (lastNode)
		{
			this.drawLine(this.viewmodel.convertX(lastNode.x),this.viewmodel.convertY(lastNode.y),this.viewmodel.convertX(x),this.viewmodel.convertY(y),wallWidthHover,wallColorHover);
		}
	}
	
	drawBezierObject(bezier, width=3, color='#f0f0f0')
	{
		this.drawCurvedLine(
		this.viewmodel.convertX(bezier.points[0].x),
		this.viewmodel.convertY(bezier.points[0].y),
		
		this.viewmodel.convertX(bezier.points[1].x),
		this.viewmodel.convertY(bezier.points[1].y),
		
		this.viewmodel.convertX(bezier.points[2].x),
		this.viewmodel.convertY(bezier.points[2].y),
		
		this.viewmodel.convertX(bezier.points[3].x),
		this.viewmodel.convertY(bezier.points[3].y),
		width,color);
	}
	
	drawCurvedLine(startX, startY, aX, aY, bX, bY, endX, endY, width, color)
	{
		this.context.beginPath();
		this.context.moveTo(startX, startY);
		this.context.bezierCurveTo(aX, aY, bX, bY, endX, endY);
//		this.context.closePath();
		this.context.lineWidth = width+3;
		this.context.strokeStyle = '#999999';
		this.context.stroke();
		
		// width is an integer
		// color is a hex string, i.e. #ff0000
		this.context.beginPath();
		this.context.moveTo(startX, startY);
		this.context.bezierCurveTo(aX, aY, bX, bY, endX, endY);
//		this.context.closePath();
		this.context.lineWidth = width;
		this.context.strokeStyle = color;
		this.context.stroke();
	}

	/** */
	drawLine(startX, startY, endX, endY, width, color)
	{
		// width is an integer
		// color is a hex string, i.e. #ff0000
		this.context.beginPath();
		this.context.moveTo(startX, startY);
		this.context.lineTo(endX, endY);
		this.context.closePath();
		this.context.lineWidth = width;
		this.context.strokeStyle = color;
		this.context.stroke();
	}
	
	/** */
	drawPolygonCurved(pointsets, fill=true, fillColor='#FF00FF', stroke=false, strokeColor='#000000', strokeWidth=5)
	{
		// fillColor is a hex string, i.e. #ff0000
		fill = fill || false;
		stroke = stroke || false;
		this.context.beginPath();
		
		for (var i=0;i<pointsets.length;i++)
		{
			var pointset = pointsets[i];
//			The pointset represents a straight line if there are only 1 point in the pointset
			if(pointset.length == 1)
			{
				if(i == 0)
				{
					this.context.moveTo(this.viewmodel.convertX(pointset[0].x), this.viewmodel.convertY(pointset[0].y));
				}
				else
				{
					this.context.lineTo(this.viewmodel.convertX(pointset[0].x), this.viewmodel.convertY(pointset[0].y));
				}				
			}
//			If the pointset contains 3 points then it represents a bezier curve, ap1, ap2, cp2
			else if(pointset.length == 3)
			{
				this.context.bezierCurveTo(
						this.viewmodel.convertX(pointset[0].x), this.viewmodel.convertY(pointset[0].y),
						this.viewmodel.convertX(pointset[1].x), this.viewmodel.convertY(pointset[1].y),
						this.viewmodel.convertX(pointset[2].x), this.viewmodel.convertY(pointset[2].y)
						);
			}
		}
		
		this.context.closePath();
		if (fill)
		{
			this.context.fillStyle = fillColor;
			this.context.fill();
		}
		if (stroke)
		{
			this.context.lineWidth = strokeWidth;
			this.context.strokeStyle = strokeColor;
			this.context.stroke();
		}
		
//		Dubegging
//		for (i=0;i<pointsets.length;i++)
//		{
//			pointset = pointsets[i];
//			if(pointset.length == 3)
//			{
//				this.drawCircle(this.viewmodel.convertX(pointset[0].x), this.viewmodel.convertY(pointset[0].y), 5, '#ff0000');
//				this.drawCircle(this.viewmodel.convertX(pointset[1].x), this.viewmodel.convertY(pointset[1].y), 5, '#0000ff');
//			}
//		}
	}

	/** */
	drawPolygon(xArr, yArr, fill, fillColor, stroke, strokeColor, strokeWidth)
	{
		// fillColor is a hex string, i.e. #ff0000
		fill = fill || false;
		stroke = stroke || false;
		this.context.beginPath();
		this.context.moveTo(xArr[0], yArr[0]);
		for (var i = 1; i < xArr.length; i++)
		{
			this.context.lineTo(xArr[i], yArr[i]);
		}
		this.context.closePath();
		if (fill)
		{
			this.context.fillStyle = fillColor;
			this.context.fill();
		}
		if (stroke)
		{
			this.context.lineWidth = strokeWidth;
			this.context.strokeStyle = strokeColor;
			this.context.stroke();
		}
	}

	/** */
	drawCircle(centerX, centerY, radius, fillColor)
	{
		this.context.beginPath();
		this.context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		this.context.closePath();
		this.context.fillStyle = fillColor;
		this.context.fill();
	}

	/** returns n where -gridSize/2 < n <= gridSize/2  */
	calculateGridOffset(n)
	{
		var gspacing = Dimensioning.cmToPixel(Configuration.getNumericValue(gridSpacing));
		if (n >= 0)
		{
			return (n + (gspacing) / 2.0) % (gspacing) - (gspacing) / 2.0;
		}
		else
		{
			return (n - (gspacing) / 2.0) % (gspacing) + (gspacing) / 2.0;
		}
	}

	/** */
	drawGrid()
	{
		var gspacing = Dimensioning.cmToPixel(Configuration.getNumericValue(gridSpacing));
		var offsetX = this.calculateGridOffset(-this.viewmodel.originX);
		var offsetY = this.calculateGridOffset(-this.viewmodel.originY);
		var width = this.canvasElement.width;
		var height = this.canvasElement.height;
		var scale = Configuration.getNumericValue('scale');
		if(scale < 1.0)
		{
			width = width / scale;
			height = height / scale;
		}
		
		for (var x = 0; x <= (width / gspacing); x++)
		{
			this.drawLine((gspacing * x) + offsetX, 0, (gspacing * x) + offsetX, height, gridWidth, gridColor);
		}
		for (var y = 0; y <= (height / gspacing); y++)
		{
			this.drawLine(0, (gspacing * y) + offsetY, width, (gspacing * y) + offsetY, gridWidth, gridColor);
		}
	}
}
