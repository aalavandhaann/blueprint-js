from Blueprint3DJSBPY.bp3dpy.core.utils import uid;

class Wall():
    def __init__(self, thickness, startCorner, endCorner, id):

        self.__name = 'Wall';
        self.__thickness = thickness;
        self.__start = startCorner;
        self.__end = endCorner;

        self.__id = id or uid();

        self.__start.attachStart(self);
        self.__end.attachEnd(self);

        self.__frontEdge = None;
        self.__backEdge = None;

        self.__attachedRooms = [];

        self.__frontTexture = None;
        self.__backTexture = None;
    
    def addRoom(self, room):
        self.__attachedRooms.append(room);

    @property
    def name(self):
        return self.__name;    
    @name.setter
    def name(self, value):
        self.__name = value;
    
    @property
    def id(self):
        return self.__id;

    @property
    def thickness(self):
        return self.__thickness;
    
    @thickness.setter
    def thickness(self, value):
        self.__thickness = value;

    @property
    def start(self):
        return self.__start;
    
    @property
    def end(self):
        return self.__end;
    
    @property
    def frontEdge(self):
        return self.__frontEdge;
    
    @frontEdge.setter
    def frontEdge(self, edge):
        self.__frontEdge = edge;
    
    @property
    def backEdge(self):
        return self.__backEdge;

    @backEdge.setter
    def backEdge(self, edge):
        self.__backEdge = edge;

    @property
    def frontTexture(self):
        return self.__frontTexture;
    
    @frontTexture.setter
    def frontTexture(self, texturePack):
        self.__frontTexture = texturePack;    

    @property
    def backTexture(self):
        return self.__backTexture;

    @backTexture.setter
    def backTexture(self, texture):
        self.__backTexture = texture;
