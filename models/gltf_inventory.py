import os;
from shutil import copyfile;
import json;
import numpy as np;
from scipy.interpolate.interpolate_wrapper import logarithmic
import matplotlib.cm as cm;
from matplotlib.cm import get_cmap;
import matplotlib.colors as clrs;

from PIL import Image, ImageOps;

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
    
def getMeshesFromDirectory(directorypath, mesh_exclusions=[]):
    return getFilesFromDirectory(directorypath, extension='.obj', exclusions=mesh_exclusions);

def createDir(pathdir):
    if(not os.path.exists(pathdir)):
        os.makedirs(pathdir);    
    return os.path.abspath(pathdir);

def findEquivalent(filename, thumbs):
    for thumbmap in thumbs:
        thumbname = thumbmap['purename'];
        if(thumbname == filename):
            return thumbmap;
    
    return None;

def createJSONJS(jsonitems, export_to_file, mformat='gltf'):
    json_items = [];
    
    for (mname, mtype, mpath, tpath) in jsonitems:       
        json_item = {'name':mname.capitalize(), 'image': tpath, 'model': mpath, 'type':mtype, 'format':mformat};
        json_items.append(json_item);
            
    f = open(os.path.abspath(export_to_file), 'w');
    line1 = '$(document).ready(function() {';
    line2 = '\tvar items = ' + json.dumps(json_items);
    line3 = '\tvar itemsDiv = $("#items-wrapper");'
    line4 = '\tfor (var i = 0; i < items.length; i++) {';
    line5 = '\t\tvar item = items[i];';
    line6 = '\t\tvar modelformat = (item.format) ? \'model-format="\'+item.format+\'"\' : "";';
    line7 = '\t\tvar html = \'<div class="col-sm-4">\';';
    line8 = '\t\tvar atag = \'<a class="thumbnail add-item"\' +\' model-name="\'+ item.name +\'"\' +\' model-url="\' +item.model+\'"\' +\' model-type="\' +item.type+\'"\' + modelformat+\'>\'+\'<img src="\'+item.image +\'" alt="Add Item"> \'+item.name +\'</a></div>\';';
    line9 = '\t\thtml = html + atag;';
    line10 = '\t\titemsDiv.append(html);';
    line11 = '\t};';
    line12 = '});';
    f.writelines('\n'.join([line1, line2, line3, line4, line5, line6, line7, line8, line9, line10, line11, line12]));
    f.close();


def createItemsJSON(gltf_files, thumbnails, objfiles=None):    
    json_gltf_items = [];
    
    for gltf_map in gltf_files:
        
        gltf_file_path = gltf_map['filepath'];
        gltf_name = gltf_map['purename'];
        gltf_type = os.path.basename(os.path.dirname(os.path.realpath(gltf_file_path)));
        
        thumbnail_map = findEquivalent(gltf_name, thumbnails);
        thumbnail_path = thumbnail_map['filepath'];
        
        export_gltf_path = os.path.join(export_dir_gltf, gltf_map['filename']);
        export_gltf_r_path = os.path.relpath(export_gltf_path, start=export_path_root);
        
        export_thumb_path = os.path.join(export_dir_thumbnails, thumbnail_map['filename']);
        export_thumb_r_path = os.path.relpath(export_thumb_path, start=export_path_root);               
        
        copyfile(gltf_file_path, export_gltf_path);
        copyfile(thumbnail_path, export_thumb_path);
        
        json_gltf_items.append((gltf_name, gltf_type, export_gltf_r_path, export_thumb_r_path));
        
    
    createJSONJS(json_gltf_items, export_path_gltf_json);


def resizeImages(imagefilesmap):
    thumbnails_resized = createDir(os.path.abspath('./thumbnails_resized/'));
    
    ow, oh = 300, 225;
    cx, cy = int(ow*0.5), int(oh*0.5);
    white = (255, 255, 255);
    need_size = (ow, oh);
    
    for im_map in imagefilesmap:
        im_path = im_map['filepath'];
        im_purename = im_map['purename'];        
        in_img = Image.open(im_path);
        w, h = in_img.size;
        rw, rh = w, h;
        wbyhratio = float(w) / float(h);
        if(w > h):
            rw, rh = ow, ow / wbyhratio;
        if(h > w):
            rw, rh = oh * wbyhratio, oh;
        in_img = in_img.resize((int(rw), int(rh)), Image.ANTIALIAS);
        
        w, h = in_img.size;
        out_img = Image.new("RGBA", (ow, oh), white);
        out_path = os.path.join(thumbnails_resized, '%s.png'%(im_purename));
        l, t = int(cx - (w*0.5)), int(cy - (h * 0.5));
        out_img.paste(in_img, (l, t));
        out_img.save(out_path);
    
    input_thumbnails = os.path.abspath('./thumbnails');
    thumbail_resized_files =  getFilesFromDirectory(thumbnails_resized, extension='.png');
    return thumbail_resized_files;
    
in_format = 'gltf';
in_format_extension = 'glb';

input_gltf_meshes = os.path.abspath('./%s'%(in_format));
input_original_thumbnails = os.path.abspath('./thumbnails');
input_thumbnails = os.path.abspath('./thumbnails_resized');

export_path_root = os.path.abspath('../build/');
export_path_gltf_json = os.path.abspath('../build/js/items_%s.js'%(in_format));

export_dir_gltf = createDir(os.path.abspath('../build/models/%s/'%(in_format)));
export_dir_thumbnails = createDir(os.path.abspath('../build/models/thumbnails_new/'));

gltf_mesh_files = getFilesFromDirectory(input_gltf_meshes, extension=['.%s'%(in_format_extension), '.gltf'], recursive=True);
thumbail_files =  getFilesFromDirectory(input_thumbnails, extension=['.png']);
gltf_mesh_files = sorted(gltf_mesh_files, key=lambda k: k['purename']);

if __name__ == "__main__":
    resizeImages(getFilesFromDirectory(input_original_thumbnails, extension='.png'));
    createItemsJSON(gltf_mesh_files, thumbail_files);
    
