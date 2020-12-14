from Blueprint3DJSBPY.bp3dpy.model.half_edge import HalfEdge;

class Room():
    def __init__(self, name, floorplan, corners):
        self.__name = name;
        self.__floorplan = floorplan;
        self.__corners = corners;
        self.__walls = [];
        self.__edgePointer = None;

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
        self.__interiorCorners = [];
        


    def getUuid(self):
        cornerIds = [corner.id for corner in self.__corners];
        cornerIds = sorted(cornerIds);
        return ','.join(cornerIds);



    @property
    def edgePointer(self):
        return self.__edgePointer;