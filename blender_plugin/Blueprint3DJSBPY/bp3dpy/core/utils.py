import math;
import random;

def uid():
    def tS4():
        return hex(math.floor((1.0 + random.uniform(0.0, 1.0)) * 0x10000))[2:];        
    return tS4() + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + '-' + tS4() + tS4() + tS4();