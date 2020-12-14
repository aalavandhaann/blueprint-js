from Blueprint3DJSBPY.bp3dpy.core.constants import dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter;
from Blueprint3DJSBPY.bp3dpy.core import Configuration;
from Blueprint3DJSBPY.bp3dpy.core.Configuration import configDimUnit;
from Blueprint3DJSBPY.bp3dpy.core import Dimensioning;

from Blueprint3DJSBPY.bp3dpy.model.corner import Corner;
from Blueprint3DJSBPY.bp3dpy.model.wall import Wall;
from Blueprint3DJSBPY.bp3dpy.model.room import Room;

class Floorplan():
    def __init__(self):
        self.__walls = [];
        self.__corners = [];
        self.__rooms = [];
        self.__floorTextures = {};
    
    def reset(self):
        self.__corners = [];
        self.__walls = [];
        self.__rooms = [];
        self.__floorTextures = {};

    def loadFloorplan(self, floorplan):
        self.reset();

        if(floorplan is None):
            return False;
        if(not floorplan.get('corners') or not floorplan.get('walls') or not floorplan.get('rooms')):
            return False;
        
        if(floorplan.get('units')):
            currentUnit = floorplan.get('units');
            if(currentUnit == dimInch):
                Configuration.setValue(configDimUnit, dimInch);
            elif(currentUnit == dimFeetAndInch):
                Configuration.setValue(configDimUnit, dimFeetAndInch);
            elif(currentUnit == dimMeter):
                Configuration.setValue(configDimUnit, dimMeter);
            elif(currentUnit == dimCentiMeter):
                Configuration.setValue(configDimUnit, dimCentiMeter);
            elif(currentUnit == dimMilliMeter):
                Configuration.setValue(configDimUnit, dimMilliMeter);
            else:
                Configuration.setValue(configDimUnit, dimCentiMeter);
        
        corners = floorplan.get('corners');
        cornersById = {};

        for k in corners.keys():
            cornerData = corners[k];
            x, y, elevation = Dimensioning.cmFromMeasureRaw(cornerData.get('x')), Dimensioning.cmFromMeasureRaw(cornerData.get('y')), Dimensioning.cmFromMeasureRaw(cornerData.get('elevation'));
            corner = Corner(self, x, y, elevation, k);
            cornersById[corner.id] = corner;
            self.__corners.append(corner);
            print('CORNER : ', corner);

        walls = floorplan.get('walls');

        for wallData in walls:
            startCorner, endCorner = cornersById[wallData.get('corner1')], cornersById[wallData.get('corner2')];
            frontTexture, backTexture = wallData.get('frontTexture'), wallData.get('backTexture');
            thickness = wallData.get('thickness');
            wall = Wall(thickness, startCorner, endCorner, id);
            wall.frontTexture = frontTexture;
            wall.backTexture = backTexture;
            self.__walls.append(wall);
        
        rooms = floorplan.get('rooms');
        roomTextures = floorplan.get('newFloorTextures');
        for roomKey in rooms:
            cornerIdKeys = roomKey.split(',');
            roomCorners = [cornersById[ckey] for ckey in cornerIdKeys];
            roomName = rooms[roomKey].get('name');
            room = Room(roomName, self, roomCorners);
            roomTexture = roomTextures.get(room.getUuid());
            self.__rooms.append(room);
            if(roomTexture):
                self.__floorTextures[room.getUuid()] = roomTexture;
    

    @property
    def corners(self):
        return self.__corners;
    
    @property
    def walls(self):
        return self.__walls;
    
    @property
    def rooms(self):
        return self.__rooms;
    
    @property
    def floorTextures(self):
        return self.__floorTextures;
    



