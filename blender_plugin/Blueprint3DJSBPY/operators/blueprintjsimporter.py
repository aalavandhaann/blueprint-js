import bpy;
import os;
import zipfile;

from Blueprint3DJSBPY.bp3dpy.model.model import Model;

class BlueprintJSImporterOperator(bpy.types.Operator):
    bl_idname = "bp3djs.blueprintjsimporter"
    bl_label = "BlueprintJSImporter"
    bl_options = {'REGISTER', 'UNDO'};#, 'REDO'

    def __processZipFile(self, context):       

        model = Model();
        
        blend_file_path = bpy.path.abspath(bpy.data.filepath);
        blend_file_dir = os.path.dirname(blend_file_path);
        zip_file_path = bpy.path.abspath(context.scene.bp3djs_project_file);
        zip_file_purename = os.path.basename(zip_file_path)[:-4];

        zip_extract_path = os.path.abspath(os.path.join(blend_file_dir, zip_file_purename));

        if(not os.path.exists(zip_file_path)):
            return None;
        zip_file = zipfile.ZipFile(zip_file_path);
        zip_file_contents = zip_file.namelist();
        
        if(not 'design.blueprint3d' in zip_file_contents):
            return None;

        zip_file.extractall(zip_extract_path);

        design_json_file = os.path.abspath(os.path.join(zip_extract_path, 'design.blueprint3d'));
        
        model.loadSerialized(design_json_file);

        return zip_file;

    def execute(self, context):
        if(not bpy.data.is_saved):
            self.report({'WARNING'}, 'The .blend file needs to be saved first before importing the bluprint-js project');
            return {'CANCELLED'};

        extracted_files_location = self.__processZipFile(context);
        if(not extracted_files_location):
            self.report({'ERROR'}, 'Invalid zip file or does not exist. Check the path and try again');

        return {'FINISHED'}