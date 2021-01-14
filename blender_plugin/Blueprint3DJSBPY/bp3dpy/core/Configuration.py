import bpy;
from Blueprint3DJSBPY.bp3dpy.core.constants import dimCentiMeter, dimMeter, dimMilliMeter, dimInch, dimFeetAndInch;

BLENDER_LENGTH_UNITS = {dimCentiMeter: 'CENTIMETERS', dimMeter: 'METERS', dimMilliMeter: 'MILLIMETERS', dimInch: 'INCHES', dimFeetAndInch: 'FEET'};
BLENDER_SYSTEM_UNITS = {dimCentiMeter: 'METRIC', dimMeter: 'METRIC', dimMilliMeter: 'METRIC', dimInch: 'IMPERIAL', dimFeetAndInch: 'IMPERIAL'};


configDimUnit = 'dimUnit';
configWallHeight = 'wallHeight';
configWallThickness = 'wallThickness';
configSystemUI = 'systemUI';
config = { configDimUnit: dimCentiMeter};

def getData():
    return config;

def setValue(key, value):
    if(key == configDimUnit):
        scene = bpy.context.scene;
        scene.unit_settings.system = BLENDER_SYSTEM_UNITS[value];
        scene.unit_settings.length_unit = BLENDER_LENGTH_UNITS[value];
        
    config[key] = value;

def getStringValue(key):
    try:
        if(key == configDimUnit):
            return getData()[key];
    except KeyError:
        raise KeyError('Invalid string configuration parameter ', key);