import os, sys, json;
import pathlib

read_write_floors_data = [os.path.abspath('./textures/Floor'), os.path.abspath('/home/ashok/Workspace/blueprint-js/src/floor_textures.json')]
read_write_walls_data = [os.path.abspath('./textures/Wall'), os.path.abspath('/home/ashok/Workspace/blueprint-js/src/wall_textures.json')]

USE_RELATIVE_PATH_FROM  = os.getcwd()
INPUT_TEXTURES_DIRECTORY = read_write_walls_data[0]
OUTPUT_JSON_FILE = read_write_walls_data[1]

TEXTURE_SUB_TYPES = ['basecolor', 'normal', 'roughness', 'ambientOcclusion', 'height']
TEXTURE_SUB_POLYHAVE_TYPES = ['diff', 'nor', 'rough', 'ambientOcclusion', 'disp']
TEXTURE_SUB_KEY_NAMES = ['colormap', 'normalmap', 'roughnessmap', 'ambientmap', 'bumpmap']
def getFilesFromDirectory(directorypath, extension=['.obj'], *, exclusions=[], recursive=False):
    found_files = []
    for root, directories, files in os.walk(os.path.abspath(directorypath)):
        for fname in files:
            f = pathlib.Path(os.path.join(root, fname))
            if(f.suffix in tuple(extension)):
                real_ext = f.suffix#[ext for ext in extension if f.endswith(ext)][0];
#                 Purename is the name without the file extension
                purename = f.stem#f[:f.index(real_ext)];
                if(not (f in exclusions or purename in exclusions)):
                    found_files.append({'filename':f, 'purename':purename, 'filepath':f})
        if(not recursive):
            return found_files

    return found_files

def groupTexturesByDirectory(texturefilesmap):
    texture_directories = {}
    for tmap in texturefilesmap:
        directorypath = tmap['filepath'].parents[0]
        texturename = directorypath.name#os.path.basename(directorypath)
        texturefilename = tmap['purename']
        if(not texturename in texture_directories):
            texture_directories[texturename] = {}
        
        for i, texture_identifier_name in enumerate(TEXTURE_SUB_TYPES):
            if(texture_identifier_name.lower() in texturefilename.lower()):
                relative_path = os.path.relpath(tmap['filepath'], start = USE_RELATIVE_PATH_FROM)
                texture_directories[texturename][TEXTURE_SUB_KEY_NAMES[i]] = relative_path        

    return texture_directories;

if __name__ == '__main__':
    # print(INPUT_TEXTURES_DIRECTORY)
    texture_files = getFilesFromDirectory(INPUT_TEXTURES_DIRECTORY, extension=['.jpg','.png', '.exr'], recursive=True)
    # print(texture_files)
    texture_maps = groupTexturesByDirectory(texture_files)
    # print(texture_maps)
    f = open(OUTPUT_JSON_FILE, 'w+')
    with f as json_file:        
        json.dump(texture_maps, json_file)
    f.close()