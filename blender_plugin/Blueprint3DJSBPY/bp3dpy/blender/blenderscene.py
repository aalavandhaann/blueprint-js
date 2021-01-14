import bpy;
from Blueprint3DJSBPY.bp3dpy.core.utils import newCollection;
from Blueprint3DJSBPY.bp3dpy.blender.room3d import Room3D;
from Blueprint3DJSBPY.bp3dpy.blender.halfedge3d import HalfEdge3D;


class BlenderSceneViewer():
    def __init__(self, context, model, scene, collection, assets_path):
        self.__context = context;
        self.__collection = collection;
        self.__model = model;
        self.__scene = scene;
        self.__floorplan = self.__model.floorplan;
        self.__assets_path = assets_path;
        self.__createFloorPlan();

    def __createFloorPlan(self):
        collection = self.__collection;

        roomCollection = newCollection('rooms');#bpy.data.collections.get('rooms') or bpy.data.collections.new('rooms');
        wallCollection = newCollection('walls');#bpy.data.collections.get('walls') or bpy.data.collections.new('walls');

        collection.children.link(roomCollection);
        collection.children.link(wallCollection);

        rooms = self.__floorplan.rooms;
        wallEdges = self.__floorplan.wallEdges();

        for room in rooms:
            room3d = Room3D(self.__scene, room, roomCollection, self.__context, self.__assets_path);

        for halfEdge in wallEdges:
            edge3d = HalfEdge3D(self.__scene, halfEdge, wallCollection, self.__context, self.__assets_path);

        
