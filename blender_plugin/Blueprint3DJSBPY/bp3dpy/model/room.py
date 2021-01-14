from Blueprint3DJSBPY.bp3dpy.model.half_edge import HalfEdge;
from mathutils import Vector;

class Room():
    def __init__(self, name, floorplan, corners):
        self.__name = name;
        self.__floorplan = floorplan;
        self.__corners = corners;
        self.__walls = [];
        self.__interiorCorners = [];
        self.__interiorCorners3D = [];
        self.__edgePointer = None;

        self.__floorRectangleSize = None;

        self.updateWalls();
        self.updateInteriorCorners();

        for corner in self.__corners:
            corner.attachRoom(self);    

    def updateWalls(self):
        prevEdge = None;
        firstEdge = None;
        self.__walls = [];

        for i, firstCorner in enumerate(self.__corners):
            secondCorner = self.__corners[(i+1) % len(self.__corners)];

            wallTo = firstCorner.wallTo(secondCorner);
            wallFrom = firstCorner.wallFrom(secondCorner);

            edge = None;

            if(wallTo):
                edge = HalfEdge(self, wallTo, True);
            elif(wallFrom):
                edge = HalfEdge(self, wallFrom, False);
            else:
                print('corners arent connected by a wall, uh oh');

            if(wallTo and not wallTo in self.__walls):
                self.__walls.append(wallTo);
                wallTo.addRoom(self);
            
            if(wallFrom and not wallFrom in self.__walls):
                self.__walls.append(wallFrom);
                wallFrom.addRoom(self);

            if(i == 0):
                firstEdge = edge;
            else:
                edge.prev = prevEdge;
                prevEdge.next = edge;
                if(i + 1 == len(self.__corners)):
                    firstEdge.prev = edge;
                    edge.next = firstEdge;
            
            prevEdge = edge;

        self.__edgePointer = firstEdge;

    def updateInteriorCorners(self):
        minB, maxB = Vector((1e10, 1e10)), Vector((-1e10, -1e10));
        self.__interiorCorners = [];
        edge = self.__edgePointer;
        iterateWhile = True;
        while(iterateWhile):
            iStart = edge.interiorStart();
            cStart = edge.getStart();

            minB.x = min(iStart.x, minB.x);
            minB.y = min(iStart.y, minB.y);
            maxB.x = max(maxB.x, iStart.x);
            maxB.y = max(maxB.y, iStart.y);

            self.__interiorCorners.append(iStart);
            self.__interiorCorners3D.append(Vector((iStart.x, iStart.y, cStart.elevation)));
            if(edge.next == self.__edgePointer):
                break;
            else:
                edge = edge.next;

        self.__floorRectangleSize = maxB - minB;

    def getUuid(self):
        cornerIds = [corner.id for corner in self.__corners];
        cornerIds = sorted(cornerIds);
        return ','.join(cornerIds);

    def getTexture(self):
        uuid = self.getUuid();
        tex = self.__floorplan.getFloorTexture(uuid);
        return tex;

    @property
    def floorRectangleSize(self):
        return self.__floorRectangleSize;

    @property
    def edgePointer(self):
        return self.__edgePointer;

    @property
    def interiorCorners(self):
        return self.__interiorCorners;
    
    @property
    def interiorCorners3D(self):
        return self.__interiorCorners3D;

    