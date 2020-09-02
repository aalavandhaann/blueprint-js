import { Vector3, Vector2 } from 'three';
import { Math as THREEMath } from 'three';
import { checkIntersection } from 'line-intersect';

export class Utils {
    /** Determines the distance of a point from a line.
     * @param point The Point coordinates as THREE.Vector2
     * @param start The starting coordinates of the line as THREE.Vector2
     * @param end The ending coordinates of the line as THREE.Vector2
     * @returns The distance value (number).
     */
    static pointDistanceFromLine(point, start, end) {
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
    static closestPointOnLine(point, start, end) {
        // Inspired by: http://stackoverflow.com/a/6853926
        var tA = point.x - start.x;
        var tB = point.y - start.y;
        var tC = end.x - start.x;
        var tD = end.y - start.y;

        var tDot = tA * tC + tB * tD;
        var tLenSq = tC * tC + tD * tD;
        var tParam = tDot / tLenSq;

        var tXx, tYy;

        if (tParam < 0 || (start.x === end.x && start.y === end.y)) {
            tXx = start.x;
            tYy = start.y;
        } else if (tParam > 1) {
            tXx = end.x;
            tYy = end.y;
        } else {
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
    static distance(start, end) {
        return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    }

    /**  Gets the angle between point1 -> start and 0,0 -> point2 (-pi to pi)
     * @returns The angle.
     */
    static angle(start, end) {
        var tDot = start.x * end.x + start.y * end.y;
        var tDet = start.x * end.y - start.y * end.x;
        var tAngle = -Math.atan2(tDet, tDot);
        return tAngle;
    }

    /** shifts angle to be 0 to 2pi */
    static angle2pi(start, end) {
        var tTheta = Utils.angle(start, end);
        if (tTheta < 0) {
            tTheta += 2.0 * Math.PI;
        }
        return tTheta;
    }

    /** shifts angle to be 0 to 2pi */
    static getCyclicOrder(points, start = undefined) {
        if (!start) {
            start = new Vector2(0, 0);
        }
        var angles = [];
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            var vect = point.clone().sub(start);
            var radians = Math.atan2(vect.y, vect.x);
            var degrees = THREEMath.radToDeg(radians);
            degrees = (degrees > 0) ? degrees : (degrees + 360) % 360;
            angles.push(degrees);
        }
        var indices = Utils.argsort(angles);
        var sortedAngles = [];
        var sortedPoints = [];
        for (i = 0; i < indices.length; i++) {
            sortedAngles.push(angles[indices[i]]);
            sortedPoints.push(points[indices[i]]);
        }
        return { indices: indices, angles: sortedAngles, points: sortedPoints };
    }

    static argsort(numericalValues, direction = 1) {
        var indices = Array.from(new Array(numericalValues.length), (val, index) => index);
        return indices
            .map((item, index) => [numericalValues[index], item]) // add the clickCount to sort by
            .sort(([count1], [count2]) => (count1 - count2) * direction) // sort by the clickCount data
            .map(([, item]) => item); // extract the sorted items
    }

    /** Checks if an array of points is clockwise.
     * @param points Is array of points with x,y attributes
     * @returns True if clockwise.
     */
    static isClockwise(points) {
        // make positive
        let tSubX = Math.min(0, Math.min.apply(null, Utils.map(points, function(p) {
            return p.x;
        })));
        let tSubY = Math.min(0, Math.min.apply(null, Utils.map(points, function(p) {
            return p.x;
        })));

        var tNewPoints = Utils.map(points, function(p) {
            return {
                x: p.x - tSubX,
                y: p.y - tSubY
            };
        });

        // determine CW/CCW, based on:
        // http://stackoverflow.com/questions/1165647
        var tSum = 0;
        for (var tI = 0; tI < tNewPoints.length; tI++) {
            var tC1 = tNewPoints[tI];
            var tC2;
            if (tI === tNewPoints.length - 1) {
                tC2 = tNewPoints[0];
            } else {
                tC2 = tNewPoints[tI + 1];
            }
            tSum += (tC2.x - tC1.x) * (tC2.y + tC1.y);
        }
        return (tSum >= 0);
    }

    /** Creates a Guide.
     * @returns A new Guide.
     */
    static guide() {
        var tS4 = function() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        };
        return tS4() + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + tS4() + tS4();
    }

    /** both arguments are arrays of corners with x,y attributes */
    static polygonPolygonIntersect(firstCorners, secondCorners) {
        for (var tI = 0; tI < firstCorners.length; tI++) {
            var tFirstCorner = firstCorners[tI],
                tSecondCorner;
            if (tI === firstCorners.length - 1) {
                tSecondCorner = firstCorners[0];
            } else {
                tSecondCorner = firstCorners[tI + 1];
            }
            if (Utils.linePolygonIntersect(tFirstCorner.x, tFirstCorner.y, tSecondCorner.x, tSecondCorner.y, secondCorners)) {
                return true;
            }
        }
        return false;
    }

    /** Corners is an array of points with x,y attributes */
    static linePolygonIntersect(point, point2, corners) {
        for (var tI = 0; tI < corners.length; tI++) {
            var tFirstCorner = corners[tI],
                tSecondCorner;
            if (tI === corners.length - 1) {
                tSecondCorner = corners[0];
            } else {
                tSecondCorner = corners[tI + 1];
            }
            if (Utils.lineLineIntersect(point, point2, { x: tFirstCorner.x, y: tFirstCorner.y }, { x: tSecondCorner.x, y: tSecondCorner.y })) {
                return true;
            }
        }
        return false;
    }

    /** */
    static lineLineIntersectPoint(aStart, aEnd, bStart, bEnd) {
        var result = checkIntersection(aStart.x, aStart.y, aEnd.x, aEnd.y, bStart.x, bStart.y, bEnd.x, bEnd.y);
        if (result.point) {
            return new Vector2(result.point.x, result.point.y);
        }
        return undefined;

    }

    /** */
    static lineLineIntersect(lineAStart, lineAEnd, lineBStart, lineBEnd) {
        function tCCW(p1, p2, p3) {
            var tA = p1.x,
                tB = p1.y,
                tC = p2.x,
                tD = p2.y,
                tE = p3.x,
                tF = p3.y;
            return (tF - tB) * (tC - tA) > (tD - tB) * (tE - tA);
        }
        var tP1 = lineAStart,
            tP2 = lineAEnd,
            tP3 = lineBStart,
            tP4 = lineBEnd;
        return (tCCW(tP1, tP3, tP4) != tCCW(tP2, tP3, tP4)) && (tCCW(tP1, tP2, tP3) != tCCW(tP1, tP2, tP4));
    }

    /**
     @param corners Is an array of points with x,y attributes
      @param startX X start coord for raycast
      @param startY Y start coord for raycast
	 */
    static pointInPolygon2(point, polygon) {
        var x = point.x,
            y = point.y;
        var inside = false;
        for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            var intersect = ((((polygon[i].y <= y) && (y < polygon[j].y)) || ((polygon[j].y <= y) && (y < polygon[i].y))) && (x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x));
            if (intersect) {
                inside = !inside;
            }
        }
        return inside;
    }

    /**
     @param corners Is an array of points with x,y attributes
      @param startX X start coord for raycast
      @param startY Y start coord for raycast
	 */
    static pointInPolygon(point, corners, start) {
        start = start || new Vector2(0, 0);
        var startX = start.x || 0;
        var startY = start.y || 0;

        //ensure that point(startX, startY) is outside the polygon consists of corners
        var tMinX = 0,
            tMinY = 0;
        var tI = 0;

        if (startX === undefined || startY === undefined) {
            for (tI = 0; tI < corners.length; tI++) {
                tMinX = Math.min(tMinX, corners[tI].x);
                tMinY = Math.min(tMinX, corners[tI].y);
            }
            startX = tMinX - 10;
            startY = tMinY - 10;
        }

        var tIntersects = 0;
        for (tI = 0; tI < corners.length; tI++) {
            var tFirstCorner = corners[tI],
                tSecondCorner;
            if (tI === corners.length - 1) {
                tSecondCorner = corners[0];
            } else {
                tSecondCorner = corners[tI + 1];
            }

            if (Utils.lineLineIntersect(start, point, tFirstCorner.x, tFirstCorner.y, tSecondCorner.x, tSecondCorner.y)) {
                tIntersects++;
            }
        }
        // odd intersections means the point is in the polygon
        return ((tIntersects % 2) === 1);
    }

    /** Checks if all corners of insideCorners are inside the polygon described by outsideCorners */
    static polygonInsidePolygon(insideCorners, outsideCorners, start) {
        start.x = start.x || 0;
        start.y = start.y || 0;

        for (var tI = 0; tI < insideCorners.length; tI++) {
            if (!Utils.pointInPolygon(insideCorners[tI].x, insideCorners[tI].y, outsideCorners, start)) {
                return false;
            }
        }
        return true;
    }

    /** Checks if any corners of firstCorners is inside the polygon described by secondCorners */
    static polygonOutsidePolygon(insideCorners, outsideCorners, start) {
        start.x = start.x || 0;
        start.y = start.y || 0;

        for (var tI = 0; tI < insideCorners.length; tI++) {
            if (Utils.pointInPolygon(insideCorners[tI].x, insideCorners[tI].y, outsideCorners, start)) {
                return false;
            }
        }
        return true;
    }

    // arrays

    static forEach(array, action) {
        for (var tI = 0; tI < array.length; tI++) {
            action(array[tI]);
        }
    }

    static forEachIndexed(array, action) {
        for (var tI = 0; tI < array.length; tI++) {
            action(tI, array[tI]);
        }
    }

    static map(array, func) {
        var tResult = [];
        array.forEach((element) => {
            tResult.push(func(element));
        });
        return tResult;
    }

    /** Remove elements in array if func(element) returns true */
    static removeIf(array, func) {
        var tResult = [];
        array.forEach((element) => {
            if (!func(element)) {
                tResult.push(element);
            }
        });
        return tResult;
    }

    /** Shift the items in an array by shift (positive integer) */
    static cycle(arr, shift) {
        var tReturn = arr.slice(0);
        for (var tI = 0; tI < shift; tI++) {
            var tmp = tReturn.shift();
            tReturn.push(tmp);
        }
        return tReturn;
    }

    /** Returns in the unique elemnts in arr */
    static unique(arr, hashFunc) {
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
    static removeValue(array, value) {
        for (var tI = array.length - 1; tI >= 0; tI--) {
            if (array[tI] === value) {
                array.splice(tI, 1);
                return tI;
            }
        }
    }

    /** Checks if value is in array */
    static hasValue(array, value) {
        for (var tI = 0; tI < array.length; tI++) {
            if (array[tI] === value) {
                return true;
            }
        }
        return false;
    }

    /** Subtracts the elements in subArray from array */
    static subtract(array, subArray) {
        return Utils.removeIf(array, function(el) {
            return Utils.hasValue(subArray, el);
        });
    }

    static point2Dto3D(point2D, elevation = 0) {
        return new Vector3(point2D.x, elevation, point2D.y);
    }

    static point3Dto2D(point2D) {
        return new Vector2(point2D.x, point2D.z);
    }

    static barycentricFromCartesian(triangle, point) {
        //Vector ab
        let ab = triangle[1].clone().sub(triangle[0]);
        let ac = triangle[2].clone().sub(triangle[0]);
        let ap = point.clone().sub(triangle[0]);

        let dotAB = ab.dot(ab);
        let dotAC = ac.dot(ac);
        let dotABAC = ac.dot(ab);
        let dotAPAB = ap.dot(ab);
        let dotAPAC = ap.dot(ac);

        //Area of triangle ABC
        let areaABAC = (dotAB * dotAC) - (dotABAC * dotABAC);
        let v = ((dotAC * dotAPAB) - (dotABAC * dotAPAC)) / areaABAC;
        let w = ((dotAB * dotAPAC) - (dotABAC * dotAPAB)) / areaABAC;
        let u = 1.0 - v - w;
        return new Vector3(u, v, w);
    }

    static cartesianFromBarycenter(triangle, uvw) {
        let a = triangle[0].clone();
        let b = triangle[1].clone();
        let c = triangle[2].clone();
        let cartesian = a.multiplyScalar(uvw.x).add(b.multiplyScalar(uvw.y).add(c.multiplyScalar(uvw.z)));
        return cartesian;
    }
}


export class Region {
    constructor(points) {
        this.points = points || [];
        this.length = points.length;
    }

    area() {
        var area = 0,
            i,
            j,
            point1,
            point2;

        for (i = 0, j = this.length - 1; i < this.length; j = i, i += 1) {
            point1 = this.points[i];
            point2 = this.points[j];
            area += point1.x * point2.y;
            area -= point1.y * point2.x;
        }
        area *= 0.5;

        return area;
    };

    centroid() {
        var x = 0,
            y = 0,
            i,
            j,
            f,
            point1,
            point2;

        for (i = 0, j = this.length - 1; i < this.length; j = i, i += 1) {
            point1 = this.points[i];
            point2 = this.points[j];
            f = point1.x * point2.y - point2.x * point1.y;
            x += (point1.x + point2.x) * f;
            y += (point1.y + point2.y) * f;
        }

        f = this.area() * 6;

        return new Vector2(x / f, y / f);
    };
}