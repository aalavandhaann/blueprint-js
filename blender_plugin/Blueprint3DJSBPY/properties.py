import bpy;

def register():
    bpy.types.Scene.bp3djs_project_file = bpy.props.StringProperty(name="Blueprint3D JS Zip", subtype="FILE_PATH", default="//project.zip");

def unregister():
    del bpy.types.Scene.bp3djs_project_file;