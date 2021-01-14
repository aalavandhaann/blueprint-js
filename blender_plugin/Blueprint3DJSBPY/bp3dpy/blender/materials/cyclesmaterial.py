import os;
import bpy;
from Blueprint3DJSBPY.bp3dpy.core import Dimensioning;

class CyclesMaterial():

    def __init__(self, context, mesh, texturepack, dimensions, assets_path):
        self.__mesh = mesh;
        self.__texturepack = texturepack;
        self.__context = context;
        self.__dimensions = dimensions;
        self.__assets_path = assets_path;
        self.__material = self.__createNodeCyclesMaterial();
    
    def __getPath(self, relative_path):
        abs_path_value = os.path.abspath(os.path.join(self.__assets_path, relative_path));
        base_name = bpy.path.basename(abs_path_value);
        return base_name, abs_path_value;

    def __textureRepeatScale(self):
        repeat = self.__texturepack.get('repeat') or 200;
        repeat = Dimensioning.cmToMeasureRaw(repeat);
        repeatX, repeatY = self.__dimensions.x / repeat, self.__dimensions.y / repeat;
        return repeatX, repeatY;

    def __getImageNode(self, nodes, image_name, image_path):
        image_node = nodes.get(image_name) or nodes.new('ShaderNodeTexImage');
        image = bpy.data.images.get(image_name) or bpy.data.images.load(image_path);
        image_node.image = image;
        image_node.name = image_name;
        return image_node;


    def __createNodeCyclesMaterial(self):
        uv_map = self.__mesh.data.uv_layers[0];#.get(self.__mesh.name);

        texpack = self.__texturepack;
        mat_name = self.__mesh.name;
        mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name);

        mat.use_nodes = True;
        node_tree = mat.node_tree;
        nodes = node_tree.nodes;
        
        texcoord = nodes.get('Texture Coordinate') or nodes.new('ShaderNodeTexCoord');
        mapping = nodes.get('Mapping') or nodes.new('ShaderNodeMapping');
        principled = nodes.get('Principled BSDF') or nodes.new('ShaderNodeBsdfPrincipled');
        matout = nodes.get('Material Output') or nodes.new('ShaderNodeOutputMaterial');

        repeatX, repeatY = self.__textureRepeatScale();
        mapping.inputs[3].default_value = (repeatX, repeatY, repeatY);

        node_tree.links.new(texcoord.outputs[2], mapping.inputs[0]);


        if(texpack.get('colormap')):
            color_map_image_name, color_map_image_path = self.__getPath(texpack.get('colormap'));
            color_map_image_node = self.__getImageNode(nodes, color_map_image_name, color_map_image_path);
            node_tree.links.new(mapping.outputs[0], color_map_image_node.inputs[0]);
            node_tree.links.new(color_map_image_node.outputs[0], principled.inputs[0]);
        
        if(texpack.get('normalmap')):
            normal_map_image_name, normal_map_image_path = self.__getPath(texpack.get('normalmap'));
            normal_map_image_node = self.__getImageNode(nodes, normal_map_image_name, normal_map_image_path);

            normal_map_nmap_node = nodes.get('Normal Map') or nodes.new('ShaderNodeNormalMap');
            normal_map_nmap_node.uv_map = uv_map.name;

            node_tree.links.new(mapping.outputs[0], normal_map_image_node.inputs[0]);
            node_tree.links.new(normal_map_image_node.outputs[0], normal_map_nmap_node.inputs[1]);

            node_tree.links.new(normal_map_image_node.outputs[0], principled.inputs[19]);
        
        if(texpack.get('roughnessmap')):
            roughness_map_image_name, roughness_map_image_path = self.__getPath(texpack.get('roughnessmap'));
            roughness_map_image_node = self.__getImageNode(nodes, roughness_map_image_name, roughness_map_image_path);
            node_tree.links.new(mapping.outputs[0], roughness_map_image_node.inputs[0]);

            node_tree.links.new(roughness_map_image_node.outputs[0], principled.inputs[7]);
        

        if(texpack.get('metalmap')):
            metal_map_image_name, metal_map_image_path = self.__getPath(texpack.get('metalmap'));
            metal_map_image_node = self.__getImageNode(nodes, metal_map_image_name, metal_map_image_path);
            node_tree.links.new(mapping.outputs[0], metal_map_image_node.inputs[0]);

            node_tree.links.new(metal_map_image_node.outputs[0], principled.inputs[4]);

        if(texpack.get('ambientmap') and texpack.get('colormap')):
            ambient_map_image_name, ambient_map_image_path = self.__getPath(texpack.get('ambientmap'));
            ambient_map_image_node = self.__getImageNode(nodes, ambient_map_image_name, ambient_map_image_path);

            color_map_image_name, color_map_image_path = self.__getPath(texpack.get('colormap'));
            color_map_image_node = self.__getImageNode(nodes, color_map_image_name, color_map_image_path);
            
            mix_rgb_node = nodes.get('Mix') or nodes.new('ShaderNodeMixRGB');
            mix_rgb_node.blend_type = 'MULTIPLY';

            node_tree.links.new(mapping.outputs[0], ambient_map_image_node.inputs[0]);

            node_tree.links.new(color_map_image_node.outputs[0], mix_rgb_node.inputs[1]);
            node_tree.links.new(ambient_map_image_node.outputs[0], mix_rgb_node.inputs[2]);
            
            node_tree.links.new(mix_rgb_node.outputs[0], principled.inputs[0]);

        self.__mesh.data.materials.append(mat);  

    @property
    def material(self):
        return self.__material;