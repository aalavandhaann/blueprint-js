from Blueprint3DJSBPY.bp3dpy.core import Configuration;
from Blueprint3DJSBPY.bp3dpy.core.Configuration import configDimUnit;

from Blueprint3DJSBPY.bp3dpy.core.constants import dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter;


decimals = 1000;
cmPerFoot = 30.48;
dimensioningOptions = [dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter];

def roundOff(value, decimals):
    return round(decimals * value) / decimals;
    
def cmFromMeasureRaw(measure):    
    currentUnits = Configuration.getStringValue(configDimUnit);
    if(currentUnits == dimFeetAndInch):
        return round(decimals * (measure * 30.480016459203095991)) / decimals;
    elif(currentUnits == dimInch):
        return round(decimals * (measure * 2.5400013716002578512)) / decimals;
    elif (currentUnits == dimMilliMeter):
        return round(decimals * (measure * 0.10000005400001014955)) / decimals;
    elif (currentUnits == dimCentiMeter):
        return measure;
    elif (currentUnits == dimMeter):
        return round(decimals * 100 * measure) / decimals;

def cmToMeasureRaw(cm, power = 1):
    currentUnits = Configuration.getStringValue(configDimUnit);    
    if(currentUnits == dimFeetAndInch):
        allInFeet = (cm * 0.032808416666669996953**power);
        return allInFeet;
    elif(currentUnits == dimInch):
        inches = round(decimals * (cm * 0.393700**power)) / decimals;
        return inches;
    elif(currentUnits == dimMilliMeter):
        mm = round(decimals * (cm * 10**power)) / decimals;
        return mm;
    elif (currentUnits == dimCentiMeter):
        return round(decimals * cm) / decimals;
    elif (currentUnits == dimMeter):
        m = round(decimals * (cm * 0.01**power)) / decimals;
        return m;