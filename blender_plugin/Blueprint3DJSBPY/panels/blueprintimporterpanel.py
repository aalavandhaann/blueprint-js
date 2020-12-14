import bpy;
from Blueprint3DJSBPY.operators.blueprintjsimporter import BlueprintJSImporterOperator;


class Blueprint3DJSPanel(bpy.types.Panel):
    bl_idname = "OBJECT_PT_blueprint3Djspanel";
    bl_label = "Blueprint3D JS Importer";
    bl_context = "objectmode";
    bl_space_type = "VIEW_3D";
    bl_region_type = "UI";
    bl_category = "Blueprint3D-JS";
    bl_description = "Recreate the blueprint3d-js projects inside Blender for baking and photorealistic renderings";


    def draw(self, context):
        layout = self.layout;
        box = layout.box();
        box.label(text='Import Bp3dJS Zip');
        row = box.row();
        row.prop(context.scene, 'bp3djs_project_file');

        row = box.row();
        row.operator(BlueprintJSImporterOperator.bl_idname);

        