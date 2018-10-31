import {Vector2} from 'three';

export class Utils
{
	/** Determines the distance of a point from a line.
	 * @param point The Point coordinates as THREE.Vector2
	 * @param start The starting coordinates of the line as THREE.Vector2
	 * @param end The ending coordinates of the line as THREE.Vector2
	 * @returns The distance value (number).
	 */
	static pointDistanceFromLine(point, start, end) 
	{
		var tPoint = Utils.closestPointOnLine(point, start, end);
		var tDx = point.x - tPoint.x;
		var tDy = point.y - tPoint.y;
		return Math.sqrt(tDx * tDx + tDy * tDy);
	}

	/** Gets the projection of a point onto a line.
	 * @param point the point
	 * @param start the starting coordinates of the line as THREE.Vector2
	 * @param end the ending coordinates of the line as THREE.Vector2
	 * @returns The point as THREE.Vector2.
	 */
	static closestPointOnLine(point, start, end)
	{
		// Inspired by: http://stackoverflow.com/a/6853926
		var tA = point.x - start.x;
		var tB = point.y - start.y;
		var tC = end.x - start.x;
		var tD = end.y - start.y;

		var tDot = tA * tC + tB * tD;
		var tLenSq = tC * tC + tD * tD;
		var tParam = tDot / tLenSq;

		var tXx, tYy;

		if (tParam < 0 || (start.x == end.x && start.y == end.y)) 
		{
			tXx = start.x;
			tYy = start.y;
		}
		else if (tParam > 1) 
		{
			tXx = end.x;
			tYy = end.y;
		}
		else {
			tXx = start.x + tParam * tC;
			tYy = start.y + tParam * tD;
		}

		return new Vector2(tXx, tYy);
	}

	/** Gets the distance of two points.
	 * @param start the starting coordinate of the line as Vector2
	 * @param end the ending coordinate of the line as Vector2
	 * @returns The distance.
	 */
	static distance(start, end)
	{
		return Math.sqrt(Math.pow(end.x - start.x, 2) +  Math.pow(end.y - start.y, 2));
	}

	/**  Gets the angle between point1 -> start and 0,0 -> point2 (-pi to pi)
	 * @returns The angle.
	 */
	static angle(start, end) 
	{
		var tDot = start.x * end.x + start.y * end.y;
		var tDet = start.x * end.y - start.y * end.x;
		var tAngle = -Math.atan2(tDet, tDot);
		return tAngle;
	}

	/** shifts angle to be 0 to 2pi */
	static angle2pi(start, end) 
	{
		var tTheta = Utils.angle(start, end);
		if (tTheta < 0) 
		{
			tTheta += 2.0 * Math.PI;
		}
		return tTheta;
	}

	/** Checks if an array of points is clockwise.
	 * @param points Is array of points with x,y attributes
	 * @returns True if clockwise.
	 */
	static isClockwise(points)
	{
		// make positive
		let tSubX = Math.min(0, Math.min.apply(null, Utils.map(points, function (p) {
			return p.x;
		})));
		let tSubY = Math.min(0, Math.min.apply(null, Utils.map(points, function (p) {
			return p.x;
		})));

		var tNewPoints = Utils.map(points, function (p) {
			return {
				x: p.x - tSubX,
				y: p.y - tSubY
			};
		});

		// determine CW/CCW, based on:
			// http://stackoverflow.com/questions/1165647
		var tSum = 0;
		for (var tI = 0; tI < tNewPoints.length; tI++) 
		{
			var tC1 = tNewPoints[tI];
			var tC2;
			if (tI == tNewPoints.length - 1) 
			{
				tC2 = tNewPoints[0];
			}
			else 
			{
				tC2 = tNewPoints[tI + 1];
			}
			tSum += (tC2.x - tC1.x) * (tC2.y + tC1.y);
		}
		return (tSum >= 0);
	}

	/** Creates a Guide.
	 * @returns A new Guide.
	 */
	static guide() 
	{
		var tS4 = function () 
		{
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		};
		return tS4() + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + tS4() + tS4();
	}

	/** both arguments are arrays of corners with x,y attributes */
	static polygonPolygonIntersect(firstCorners, secondCorners)
	{
		for (var tI = 0; tI < firstCorners.length; tI++) 
		{
			var tFirstCorner = firstCorners[tI], tSecondCorner;
			if (tI == firstCorners.length - 1) 
			{
				tSecondCorner = firstCorners[0];
			}
			else 
			{
				tSecondCorner = firstCorners[tI + 1];
			}

			if (Utils.linePolygonIntersect(tFirstCorner.x, tFirstCorner.y,tSecondCorner.x, tSecondCorner.y, secondCorners)) 
			{
				return true;
			}
		}
		return false;
	}

	/** Corners is an array of points with x,y attributes */
	static linePolygonIntersect(point, point2, corners)
	{
		for (var tI = 0; tI < corners.length; tI++) 
		{
			var tFirstCorner = corners[tI],tSecondCorner;
			if (tI == corners.length - 1) 
			{
				tSecondCorner = corners[0];
			}
			else 
			{
				tSecondCorner = corners[tI + 1];
			}
			if (Utils.lineLineIntersect(point, point2, {x:tFirstCorner.x, y:tFirstCorner.y}, {x:tSecondCorner.x, y:tSecondCorner.y})) 
			{
				return true;
			}
		}
		return false;
	}

	/** */
	static lineLineIntersect(lineAStart, lineAEnd, lineBStart, lineBEnd)
	{
		function tCCW(p1, p2, p3) 
		{
			var tA = p1.x, tB = p1.y, tC = p2.x, tD = p2.y, tE = p3.x, tF = p3.y;
			return (tF - tB) * (tC - tA) > (tD - tB) * (tE - tA);
		}
		var tP1 = lineAStart, tP2 = lineAEnd, tP3 = lineBStart, tP4 = lineBEnd;
		return (tCCW(tP1, tP3, tP4) != tCCW(tP2, tP3, tP4)) && (tCCW(tP1, tP2, tP3) != tCCW(tP1, tP2, tP4));
	}

	/**
     @param corners Is an array of points with x,y attributes
      @param startX X start coord for raycast
      @param startY Y start coord for raycast
	 */
	static pointInPolygon(point, corners, start)
	{
		start = start || new Vector2(0,0);
		var startX = start.x || 0;
		var startY = start.y || 0;

		//ensure that point(startX, startY) is outside the polygon consists of corners
		var tMinX = 0, tMinY = 0;
		var tI = 0;
		
		if (startX === undefined || startY === undefined) 
		{
			for (tI = 0; tI < corners.length; tI++) 
			{
				tMinX = Math.min(tMinX, corners[tI].x);
				tMinY = Math.min(tMinX, corners[tI].y);
			}
			startX = tMinX - 10;
			startY = tMinY - 10;
		}

		var tIntersects = 0;
		for (tI = 0; tI < corners.length; tI++) 
		{
			var tFirstCorner = corners[tI], tSecondCorner;
			if (tI == corners.length - 1)
			{
				tSecondCorner = corners[0];
			}
			else 
			{
				tSecondCorner = corners[tI + 1];
			}

			if (Utils.lineLineIntersect(start, point, tFirstCorner.x, tFirstCorner.y, tSecondCorner.x, tSecondCorner.y)) 
			{
				tIntersects++;
			}
		}
		// odd intersections means the point is in the polygon
		return ((tIntersects % 2) == 1);
	}

	/** Checks if all corners of insideCorners are inside the polygon described by outsideCorners */
	static polygonInsidePolygon(insideCorners, outsideCorners, start)
	{
		start.x = start.x || 0;
		start.y = start.y || 0;
		
		for (var tI = 0; tI < insideCorners.length; tI++) 
		{
			if (!Utils.pointInPolygon(insideCorners[tI].x, insideCorners[tI].y,outsideCorners,start))
			{
				return false;
			}
		}
		return true;
	}

	/** Checks if any corners of firstCorners is inside the polygon described by secondCorners */
	static polygonOutsidePolygon(insideCorners, outsideCorners, start)
	{
		start.x = start.x || 0;
		start.y = start.y || 0;

		for (var tI = 0; tI < insideCorners.length; tI++) 
		{
			if (Utils.pointInPolygon(insideCorners[tI].x, insideCorners[tI].y,outsideCorners,start)) 
			{
				return false;
			}
		}
		return true;
	}

	// arrays

	static forEach(array, action) 
	{
		for (var tI = 0; tI < array.length; tI++) 
		{
			action(array[tI]);
		}
	}

	static forEachIndexed(array, action) 
	{
		for (var tI = 0; tI < array.length; tI++) 
		{
			action(tI, array[tI]);
		}
	}

	static map(array, func) 
	{
		var tResult = [];
		array.forEach((element) => {
			tResult.push(func(element));
		});
		return tResult;
	}

	/** Remove elements in array if func(element) returns true */
	static removeIf(array, func) 
	{
		var tResult = [];
		array.forEach((element) => {
			if (!func(element)) {
				tResult.push(element);
			}
		});
		return tResult;
	}

	/** Shift the items in an array by shift (positive integer) */
	static cycle(arr, shift) 
	{
		var tReturn = arr.slice(0);
		for (var tI = 0; tI < shift; tI++) {
			var tmp = tReturn.shift();
			tReturn.push(tmp);
		}
		return tReturn;
	}

	/** Returns in the unique elemnts in arr */
	static unique(arr, hashFunc) 
	{
		var tResults = [];
		var tMap = {};
		for (var tI = 0; tI < arr.length; tI++) {
			if (!tMap.hasOwnProperty(arr[tI])) {
				tResults.push(arr[tI]);
				tMap[hashFunc(arr[tI])] = true;
			}
		}
		return tResults;
	}

	/** Remove value from array, if it is present */
	static removeValue(array, value) 
	{
		for (var tI = array.length - 1; tI >= 0; tI--) 
		{
			if (array[tI] === value) {
				array.splice(tI, 1);
			}
		}
	}

	/** Checks if value is in array */
	static hasValue(array, value) 
	{
		for (var tI = 0; tI < array.length; tI++) 
		{
			if (array[tI] === value) 
			{
				return true;
			}
		}
		return false;
	}

	/** Subtracts the elements in subArray from array */
	static subtract(array, subArray)
	{
		return Utils.removeIf(array, function (el) {
			return Utils.hasValue(subArray, el);
		});
	}
}