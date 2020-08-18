import os, sys, json;


read_write_floors_data = [os.path.abspath('./textures/Floor'), os.path.abspath('/home/ashok/eclipse-workspace/blueprint-js/src/floor_textures.json')];
read_write_walls_data = [os.path.abspath('./textures/Wall'), os.path.abspath('/home/ashok/eclipse-workspace/blueprint-js/src/wall_textures.json')];

USE_RELATIVE_PATH_FROM  = os.getcwd();
INPUT_TEXTURES_DIRECTORY = read_write_walls_data[0];
OUTPUT_JSON_FILE = read_write_walls_data[1];

TEXTURE_SUB_TYPES = ['basecolor', 'normal', 'roughness', 'ambientOcclusion', 'height'];
TEXTURE_SUB_KEY_NAMES = ['colormap', 'normalmap', 'roughnessmap', 'ambientmap', 'bumpmap'];
def getFilesFromDirectory(directorypath, extension=['.obj'], *, exclusions=[], recursive=False):
    found_files = [];
    for root, directories, files in os.walk(os.path.abspath(directorypath)):
        for f in files:
            if(f.endswith(tuple(extension))):
                real_ext = [ext for ext in extension if f.endswith(ext)][0];
#                 Purename is the name without the file extension
                purename = f[:f.index(real_ext)];
                if(not (f in exclusions or purename in exclusions)):
                    found_files.append({'filename':f, 'purename':purename, 'filepath':os.path.join(root, f)});
        if(not recursive):
            return found_files;

    return found_files;

def groupTexturesByDirectory(texturefilesmap):
    texture_directories = {};
    for tmap in texturefilesmap:
        directorypath = os.path.dirname(tmap['filepath']);
        texturename = os.path.basename(directorypath);
        texturefilename = tmap['purename'];
        if(not texturename in texture_directories):
            texture_directories[texturename] = {};
        
        for i, texture_identifier_name in enumerate(TEXTURE_SUB_TYPES):
            if(texture_identifier_name.lower() in texturefilename.lower()):
                relative_path = os.path.relpath(tmap['filepath'], start=USE_RELATIVE_PATH_FROM);
                texture_directories[texturename][TEXTURE_SUB_KEY_NAMES[i]] = relative_path;                
    return texture_directories;

if __name__ == '__main__':
    texture_files = getFilesFromDirectory(INPUT_TEXTURES_DIRECTORY, extension=['.jpg','.png'], recursive=True);
    texture_maps = groupTexturesByDirectory(texture_files);
    f = open(OUTPUT_JSON_FILE, 'w+');
    with f as json_file:
        json.dump(texture_maps, json_file);