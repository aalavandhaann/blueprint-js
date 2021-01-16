import bpy, bmesh;
from mathutils import Vector;
from Blueprint3DJSBPY.bp3dpy.core.utils import uid, distance;
from Blueprint3DJSBPY.bp3dpy.blender.materials.cyclesmaterial import CyclesMaterial;


class HalfEdge3D():

    def __init__(self, scene, edge, collection, context, assets_path):

        self.__name = 'wall-edge-%s'%(uid());
        self.__collection = collection;
        self.__scene = scene;
        self.__edge = edge;
        self.__wall = self.__edge.wall;
        self.__assets_path = assets_path;
        self.__context = context;

        self.__createWallPlanes();

    

    def __createWallPlanes(self):
        extStartCorner = self.__edge.getStart();
        extEndCorner = self.__edge.getEnd();
        interiorStart = self.__edge.interiorStart();
        interiorEnd = self.__edge.interiorEnd();
        exteriorStart = self.__edge.exteriorStart();
        exteriorEnd = self.__edge.exteriorEnd();

        interior_wall_name = 'interior-%s'%(self.__wall.id);
        exterior_wall_name = 'exterior-%s'%(self.__wall.id);

        top_filler_name = 'top-%s'%(self.__wall.id);
        bottom_filler_name = 'bottom-%s'%(self.__wall.id);
        start_sides_filler_name = 'start-filler-%s'%(self.__wall.id);
        end_sides_filler_name = 'end-filler-%s'%(self.__wall.id);

        wall_one, wall_two = None, None;
        if(not self.__wall.frontEdge or not self.__wall.backEdge):
            wall_one = self.__makeWall(exterior_wall_name, self.__collection, exteriorStart, exteriorEnd);
        
        # print('#'*40);
        # print('WALL NAME ', interior_wall_name);
        wall_two = self.__makeWall(interior_wall_name, self.__collection, interiorStart, interiorEnd);

        for f in wall_two.data.polygons:
            if(f.normal.x < 0 or f.normal.y < 0 or f.normal.z < 0):
                f.normal.negate();

        # for i,vert in enumerate(wall_two.data.vertices):
        #     if(i > 1 and i < 3):
        #         a = vert.co - wall_two.data.vertices[i-1].co;
        #         b = wall_two.data.vertices[i-1].co - wall_two.data.vertices[i-2].co;
        #         print('AXIS ::: ', a.normalized().cross(b.normalized()).normalized());
        #         break;


        width, height = self.__edge.interiorDistance(), max(self.__wall.startElevation, self.__wall.endElevation);
        wall_texture_pack = self.__edge.getTexture();
        wall_size = Vector((width, height));

        if(wall_texture_pack):
            if(wall_one):
                wall_material_1 = CyclesMaterial(self.__context, wall_one, wall_texture_pack, wall_size, self.__assets_path);
            wall_material_2 = CyclesMaterial(self.__context, wall_two, wall_texture_pack, wall_size, self.__assets_path);


        self.buildFillerUniformHeight(bottom_filler_name, self.__collection, self.__edge, 0);
        self.buildFillerVaryingHeights(top_filler_name, self.__collection, self.__edge);
        self.buildSideFillter(start_sides_filler_name, self.__collection, interiorStart, exteriorStart, extStartCorner.elevation);
        self.buildSideFillter(end_sides_filler_name, self.__collection, interiorEnd, exteriorEnd, extEndCorner.elevation);


    def __makeWall(self, name, collection, start, end):
        v1 = self.toVec3(start);
        v2 = self.toVec3(end);
        v3 = self.toVec3(end, self.__edge.getEnd().elevation);
        v4 = self.toVec3(start, self.__edge.getStart().elevation);
        
        points = [v1, v2, v3, v4];
        totalDistance = self.__edge.interiorDistance();
        height = max(self.__wall.startElevation, self.__wall.endElevation);

        mesh = bpy.data.meshes.new(name);
        meshobject = bpy.data.objects.new(name, mesh);
        bm = bmesh.new();

        bm = self.__createMesh(name, points, bm);

        bm.to_mesh(mesh);
        bm.free();
        collection.objects.link(meshobject);

        uv_map = mesh.uv_layers.get(name) or mesh.uv_layers.new(name=name);

        for loop in mesh.loops:
            vid = loop.vertex_index;
            vertex = mesh.vertices[vid];
            vertex2d = Vector((vertex.co.x, vertex.co.y));

            u, v = distance(start, vertex2d) / totalDistance, vertex.co.z / height; 
            uv_map.data[loop.index].uv = Vector((u, v));

        return meshobject;
    

    def buildSideFillter(self, name, collection, p1, p2, height):
        points = [self.toVec3(p1), self.toVec3(p2), self.toVec3(p2, height), self.toVec3(p1, height)];
        mesh = bpy.data.meshes.new(name);
        meshobject = bpy.data.objects.new(name, mesh);
        bm = bmesh.new();

        bm = self.__createMesh(name, points, bm);

        bm.to_mesh(mesh);
        bm.free();
        collection.objects.link(meshobject);
        
        return meshobject;

    def buildFillerVaryingHeights(self, name, collection, edge):
        a = self.toVec3(edge.exteriorStart(), edge.getStart().elevation);
        b = self.toVec3(edge.exteriorEnd(), edge.getEnd().elevation);
        c = self.toVec3(edge.interiorEnd(), edge.getEnd().elevation);
        d = self.toVec3(edge.interiorStart(), edge.getStart().elevation);
        points = [a, b, c, d];

        mesh = bpy.data.meshes.new(name);
        meshobject = bpy.data.objects.new(name, mesh);
        bm = bmesh.new();

        bm = self.__createMesh(name, points, bm);

        bm.to_mesh(mesh);
        bm.free();
        collection.objects.link(meshobject);

        return meshobject;

    def buildFillerUniformHeight(self, name, collection, edge, height):
        points = [
            self.toVec3(edge.exteriorStart()), 
            self.toVec3(edge.exteriorEnd()), 
            self.toVec3(edge.interiorEnd()), 
            self.toVec3(edge.interiorStart())];

        mesh = bpy.data.meshes.new(name);
        meshobject = bpy.data.objects.new(name, mesh);
        bm = bmesh.new();

        bm = self.__createMesh(name, points, bm);

        bm.to_mesh(mesh);
        bm.free();
        collection.objects.link(meshobject);

        return meshobject;


    def __createMesh(self, name, points, bm):
        verts = [];
        edges = [];
        for i,p in enumerate(points):
            vert = bm.verts.new(p);
            if(i > 0):
                edge = bm.edges.new((verts[i-1], vert));
                edges.append(edge);            
            verts.append(vert);

        edge = bm.edges.new((verts[-1], verts[0]));
        edges.append(edge);

        bmesh.ops.holes_fill(bm, edges=edges, sides=len(edges));

        return bm;


    def toVec3(self, pos, height=0.0):
        return Vector((pos.x, pos.y, height));
