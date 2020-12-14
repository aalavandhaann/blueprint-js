from Blueprint3DJSBPY.bp3dpy.core.constants import dimCentiMeter;

configDimUnit = 'dimUnit';
configWallHeight = 'wallHeight';
configWallThickness = 'wallThickness';
configSystemUI = 'systemUI';
config = { configDimUnit: dimCentiMeter};

def getData():
    return config;

def setValue(key, value):
    config[key] = value;

def getStringValue(key):
    try:
        if(key == configDimUnit):
            return getData()[key];
    except KeyError:
        raise KeyError('Invalid string configuration parameter ', key);