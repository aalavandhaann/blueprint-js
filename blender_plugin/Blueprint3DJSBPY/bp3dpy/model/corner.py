from mathutils import Vector;
from Blueprint3DJSBPY.bp3dpy.core.utils import uid;

class Corner():
    def __init__(self, floorplan, x, y, elevation, id):
        self.__id = id or uid();
        self.__floorplan = floorplan;
        self.__x = x;
        self.__y = y;
        self.__elevation = elevation;
        self.__co = Vector((x, y));
        self.__co3 = Vector((x, y, self.__elevation));

        self.__wallStarts = [];
        self.__wallEnds = [];

        self.__attachedRooms = [];
    
    def wallTo(self, corner):
        for (wall in self.__wallStarts):
            if(wall.getEnd() == corner):
                return wall;
        return None;
    
    def wallFrom(self, corner):
        for wall in self.__wallEnds:
            if(wall.getStart() == corner):
                return wall;
        return None;

    def attachStart(self, wall):
        self.__wallStarts.append(wall);

    def attachEnd(self, wall):
        self.__wallEnds.append(wall);

    def attachRoom(self, room):
        if(room):
            self.__attachedRooms.append(room);

    @property
    def id(self):
        return self.__id;
    
    @property
    def floorplan(self):
        return self.__floorplan;
        
    @property
    def x (self):
        return self.__x;
    
    @x.setter
    def x(self, value):
        self.__x = value;
        self.__co = Vector((value, self.__co.y));
        self.__co3 = Vector((value, self.__co.y, self.__elevation));

    @property
    def y (self):
        return self.__y;
    
    @y.setter
    def y(self, value):
        self.__y = value;
        self.__co = Vector((self.__co.x, value));
        self.__co3 = Vector((self.__co.x, value, self.__elevation));
    
    @property
    def elevation (self):
        return self.__elevation;
    
    @elevation.setter
    def elevation(self, value):
        self.__elevation = value;
        self.__co3 = Vector((self.__co.x, self.__co.y, value));


    @property
    def co(self):
        return self.__co;

    @co.setter
    def co(self, coords):
        self.__x = coords.x;
        self.__y = coords.y;
        self.__co = Vector((coords.x, coords.y));
        self.__co3 = Vector((coords.x, coords.y, self.__co3.z));

    @property
    def co3(self):
        return self.__co3;

    @co3.setter
    def co3(self, coords):
        self.__x = coords.x;
        self.__y = coords.y;
        self.__elevation = coords.z;
        self.__co = Vector((coords.x, coords.y));
        self.__co3 = Vector((coords.x, coords.y, coords.z));
