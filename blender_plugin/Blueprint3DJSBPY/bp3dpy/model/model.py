import os;
import json;
from Blueprint3DJSBPY.bp3dpy.model.floorplan import Floorplan;

class Model():
    def __init__(self):
        self.__floorplan = Floorplan();
        self.__roomItems = [];
    
    def loadSerialized(self, jsonfilepath):
        f = open(os.path.abspath(jsonfilepath));
        data = json.load(f);        
        self.newDesign(data.get('floorplan'), data.get('items'));
        f.close();

    def newDesign(self, floorplan, items):
        self.__roomItems = [];
        self.__floorplan.loadFloorplan(floorplan);
    
    def reset(self):
        self.__floorplan.reset();
        del self.__roomItems[:];
    

    @property
    def floorplan(self):
        return self.__floorplan;
    
    @property
    def roomItems(self):
        return self.__roomItems;
