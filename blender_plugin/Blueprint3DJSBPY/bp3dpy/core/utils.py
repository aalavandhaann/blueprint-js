import math;
import random;
import bpy;

def newCollection(collectionName):
    collection = bpy.data.collections.get(collectionName);
    if(collection):
        bpy.data.collections.remove(collection, do_unlink=True, do_id_user=True, do_ui_user=True);
    
    return bpy.data.collections.new(collectionName);

def angle(start, end):
    tDot = start.dot(end);#start.x * end.x + start.y * end.y;
    tDet = start.x * end.y - start.y * end.x;
    return -math.atan2(tDet, tDot);

def angle2pi(start, end):
    tTheta = angle(start, end);
    if(tTheta < 0):
        tTheta += 2.0 * math.pi;
    return tTheta;

def distance(start, end):
    return (end - start).length;

def uid():
    def tS4():
        return hex(math.floor((1.0 + random.uniform(0.0, 1.0)) * 0x10000))[2:];        
    return tS4() + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + tS4() + tS4();

