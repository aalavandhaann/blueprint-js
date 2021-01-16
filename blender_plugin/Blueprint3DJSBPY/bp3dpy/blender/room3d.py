import bpy, bmesh;
from mathutils import Vector;
from Blueprint3DJSBPY.bp3dpy.core.utils import newCollection;
from Blueprint3DJSBPY.bp3dpy.blender.materials.cyclesmaterial import CyclesMaterial;

class Room3D():
    def __init__(self, scene, room, collection, context, assets_path):

        self.__context = context;
        self.__scene = scene;   
        self.__room = room;
        self.__collection = collection;
        self.__assets_path = assets_path;
        
        floor = self.__buildFloor();
        self.__buildRoof();

        floorTexture = self.__room.getTexture();
        print('RECTANGLE SIZE ::: ',self.__room.floorRectangleSize);
        if(floorTexture):
            floormaterial = CyclesMaterial(self.__context, floor, floorTexture, self.__room.floorRectangleSize, self.__assets_path);

    def __buildFloor(self):
        collection = self.__collection;#context.collection;
        roomname = 'floor-%s'%(self.__room.getUuid());#The name of the room is the id
        floormesh = bpy.data.meshes.new(roomname);
        floorobject = bpy.data.objects.new(roomname, floormesh);
        bm = bmesh.new();

        verts = [];
        edges = [];

        for i,p in enumerate(self.__room.interiorCorners):
            vert = bm.verts.new((p.x, p.y,0.0));
            if(i > 0):
                prev_vert = verts[i-1];
                edge = bm.edges.new((prev_vert, vert));
                edges.append(edge);
            verts.append(vert);
        
        edge = bm.edges.new((verts[-1], verts[0]));
        edges.append(edge);
        face = bm.faces.new(verts);
        # bmesh.ops.holes_fill(bm, edges=edges, sides=len(edges));
        bm.to_mesh(floormesh);
        bm.free();
        collection.objects.link(floorobject);

        uv_map = floormesh.uv_layers.get(roomname) or floormesh.uv_layers.new(name=roomname);

        for loop in floormesh.loops:
            vid = loop.vertex_index;
            vertex = floormesh.vertices[vid];
            u, v = (vertex.co.x - floormesh.vertices[0].co.x) / self.__room.floorRectangleSize.x , vertex.co.y / self.__room.floorRectangleSize.y; 
            uv_map.data[loop.index].uv = Vector((u, v));

        return floorobject;
    

    def __buildRoof(self):
        collection = self.__collection;#bpy.data.collections[0];

        roomname = 'roof-%s'%(self.__room.getUuid());#The name of the room is the id
        roofmesh = bpy.data.meshes.new(roomname);
        roofobject = bpy.data.objects.new(roomname, roofmesh);
        bm = bmesh.new();

        verts = [];
        edges = [];

        for i,p in enumerate(self.__room.interiorCorners3D):
            vert = bm.verts.new((p.x, p.y, p.z));
            if(i > 0):
                prev_vert = verts[i-1];
                edge = bm.edges.new((prev_vert, vert));
                edges.append(edge);
            verts.append(vert);
        
        edge = bm.edges.new((verts[-1], verts[0]));
        edges.append(edge);
        face = bm.faces.new(verts);
        # bmesh.ops.holes_fill(bm, edges=edges, sides=len(edges));
        bm.to_mesh(roofmesh);
        bm.free();
        collection.objects.link(roofobject);

        return roofobject;
