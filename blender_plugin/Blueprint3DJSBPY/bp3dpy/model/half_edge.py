from mathutils import Vector, Matrix;

class HalfEdge():
    def __init__(self, room, wall, front):
        self.__room = room;
        self.__wall = wall;
        self.__next = None;
        self.__prev = None;
        
        self.__interiorTransform = Matrix();
        self.__invInteriorTransform = Matrix();
        self.__exteriorTransform = Matrix();
        self.__invExteriorTransform = Matrix();

        self.__front = front or False;

        if(self.__front):
            self.__wall.frontEdge = self;
        else:
            self.__wall.backEdge = self;
    
    def computeTransforms(self, start, end):
        v1 = start;
        v2 = end;
        v3 = v2 - v1;
        angle = Vector((1, 0)).angle_signed(v3);

        tt = Matrix.Translation(Vector((-v1.x, 0, -v1.y)));
        tr = Matrix.Rotation(-angle, 4, Vector((0, 1, 0)));
        transform = tr * tt;
        return transform, transform.inverted();

    def getStart(self):
        if(self.__front):
            return self.__wall.start;
        else:
            return self.__wall.end;

    def getEnd(self):
        if(self.__front):
            return self.__wall.end;
        else:
            return self.__wall.start;

    def getOppositeEdge(self):
        if(self.__front):
            return self.__wall.backEdge;
        else:
            return self.__wall.frontEdge;

    def interiorCenter(self):
        return Vector(())


    @property
    def isFront(self):
        return self.__front;

    @property
    def front(self):
        return self.__front;

    @property
    def room(self):
        return self.__room;
    
    @property
    def wall(self):
        return self.__wall;
    
    @property
    def next(self):
        return self.__next;
    
    @next.setter
    def next(self, edge):
        self.__next = edge;
    
    @property
    def prev(self):
        return self.__prev;
    
    @prev.setter
    def prev(self, edge):
        self.__prev = edge;