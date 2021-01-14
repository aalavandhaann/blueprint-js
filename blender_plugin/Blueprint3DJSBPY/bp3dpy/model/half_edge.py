import math;
from mathutils import Vector, Matrix;
from Blueprint3DJSBPY.bp3dpy.core.utils import angle2pi, distance;

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

    def halfAngleVector(self, v1, v2):
        v1startX = v1startY = v1endX = v1endY = v2startX = v2startY = v2endX = v2endY = 0.0;

        # make the best of things if we dont have prev or next
        if (not v1):
            v1startX = v2.getStart().x - (v2.getEnd().x - v2.getStart().x);
            v1startY = v2.getStart().y - (v2.getEnd().y - v2.getStart().y);
            v1endX = v2.getStart().x;
            v1endY = v2.getStart().y;
        else:
            v1startX = v1.getStart().x;
            v1startY = v1.getStart().y;
            v1endX = v1.getEnd().x;
            v1endY = v1.getEnd().y;

        if (not v2):
            v2startX = v1.getEnd().x;
            v2startY = v1.getEnd().y;
            v2endX = v1.getEnd().x + (v1.getEnd().x - v1.getStart().x);
            v2endY = v1.getEnd().y + (v1.getEnd().y - v1.getStart().y);
        else:
            v2startX = v2.getStart().x;
            v2startY = v2.getStart().y;
            v2endX = v2.getEnd().x;
            v2endY = v2.getEnd().y;

        # // CCW angle between edges
        theta = angle2pi(Vector((v1startX - v1endX, v1startY - v1endY)), Vector((v2endX - v1endX, v2endY - v1endY)));

        # // cosine and sine of half angle
        cs = math.cos(theta / 2.0);
        sn = math.sin(theta / 2.0);

        # // rotate v2
        v2dx = v2endX - v2startX;
        v2dy = v2endY - v2startY;
        
        vx = v2dx * cs - v2dy * sn;
        vy = v2dx * sn + v2dy * cs;

        # // normalize
        mag = distance(Vector((0, 0)), Vector((vx, vy)));
        desiredMag = (self.wall.thickness * 0.5) / sn;
        scalar = desiredMag / mag;

        halfAngleVector = Vector((vx * scalar, vy * scalar));

        return halfAngleVector;

    def interiorPointByEdges(self, v1, v2):
        if(not v1 or not v2):
            print('RETURN HALF ANGLE VECTOR ');
            return (self.halfAngleVector(v1, v2) * 2.0);
        
        u, v, w, axis = None, None, None, None;
        dot = 0.0;

        u = (v1.getEnd().co - v1.getStart().co).normalized();
        v = (v2.getEnd().co - v2.getStart().co).normalized();

        u = u * v2.wall.thickness;
        v = v * v1.wall.thickness;

        # w = u + v;
        
        axis = u.resized(3).normalized().cross(v.resized(3).normalized()).normalized();

        if(axis.z < 0):
            v.negate();
        else:
            u.negate();
        
        dot = u.normalized().dot(v.normalized());

        if(dot < 0.0):
            uvAngle = math.acos(dot);
            offsetTheta = uvAngle - (math.pi * 0.5);
            v_temp = v.copy();
            if(dot < (1e-6 - 1.0)):
                u.x += 1e-2;
                u.y += 1e-2;

                # v.x -= 1e-4;
                # v.y -= 1e-4;

                # print(u, v, u.resized(3).normalized().cross(v.resized(3).normalized()));
                axis = u.resized(3).normalized().cross(v.resized(3).normalized());
                axis.negate()
                axis = axis.normalized();
            
            m = Matrix.Rotation(offsetTheta, 4, axis);
            v3 = m @ v.resized(3);
            v.x = v3.x;
            v.y = v3.y;

        w = u + v;
        return w;

    def getTexture(self):
        if(self.__front):
            return self.__wall.frontTexture;
        return self.__wall.backTexture;
    
    def interiorStart(self):
        vec = self.interiorPointByEdges(self.prev, self);
        vec = vec * 0.5;
        return self.getStart().co + vec;

    def interiorEnd(self):
        vec = self.interiorPointByEdges(self, self.next);
        vec = vec * 0.5;
        return self.getEnd().co + vec;
    
    def exteriorStart(self):
        vec = self.interiorPointByEdges(self.prev, self);
        vec = vec * -0.5;
        return self.getStart().co + vec;
    
    def exteriorEnd(self):
        vec = self.interiorPointByEdges(self, self.next);
        vec = vec * -0.5;
        return self.getEnd().co + vec;


    def interiorCenter(self):
        return (self.interiorStart() + self.interiorEnd()) * 0.5;
    
    def interiorDistance(self):
        return distance(self.interiorStart(), self.interiorEnd());

    def exteriorCenter(self):
        return (self.exteriorStart() + self.exteriorEnd()) * 0.5;

    def exteriorDistance(self):
        return distance(self.exteriorStart(), self.exteriorEnd());

    def corners():
        return [self.interiorStart(), self.interiorEnd(), self.exteriorEnd(), self.exteriorStart()];

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