import { Vector2, Vector3 } from 'three';
import { Configuration, configDimUnit } from './configuration.js';
import { dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter } from './constants.js';

export const decimals = 1000;

export const cmPerFoot = 30.48;
export const pixelsPerFoot = 5.0;

export const pixelsPerCm = 0.5;
export const cmPerPixel = (1.0 / pixelsPerCm);


export const dimensioningOptions = [dimInch, dimFeetAndInch, dimMeter, dimCentiMeter, dimMilliMeter];


/** Dimensioning functions. */
export class Dimensioning {
    static cmToPixelVector2D(cmV2d) {
        let pixelV2d = new Vector2(Dimensioning.cmToPixel(cmV2d.x), Dimensioning.cmToPixel(cmV2d.y));
        return pixelV2d;
    }

    static cmToPixelVector3D(cmV3d) {
        let pixelV2d = new Vector3(Dimensioning.cmToPixel(cmV3d.x), Dimensioning.cmToPixel(cmV3d.y), Dimensioning.cmToPixel(cmV3d.z));
        return pixelV2d;
    }

    static pixelToCmVector2D(pixelV2d) {
        let cmV2d = new Vector2(Dimensioning.cmToPixel(pixelV2d.x), Dimensioning.cmToPixel(pixelV2d.y));
        return cmV2d;
    }

    static pixelToCmVector3D(pixel3d) {
        let cmV2d = new Vector3(Dimensioning.cmToPixel(pixel3d.x), Dimensioning.cmToPixel(pixel3d.y), Dimensioning.cmToPixel(pixel3d.z));
        return cmV2d;
    }

    static cmToPixel(cm, apply_scale = true) {
        if (apply_scale) {
            return cm * pixelsPerCm * Configuration.getNumericValue('scale');
        }
        return cm * pixelsPerCm;
    }

    static pixelToCm(pixel, apply_scale = true) {
        if (apply_scale) {
            return pixel * cmPerPixel * (1.0 / Configuration.getNumericValue('scale'));
        }
        return pixel * cmPerPixel;
    }

    static roundOff(value, decimals) {
            return Math.round(decimals * value) / decimals;
        }
        /** Converts cm to dimensioning number.
         * @param cm Centi meter value to be converted.
         * @returns Number representation.
         */
    static cmFromMeasureRaw(measure) {
        switch (Configuration.getStringValue(configDimUnit)) {
            case dimFeetAndInch:
                return Math.round(decimals * (measure * 30.480016459203095991)) / decimals;
            case dimInch:
                return Math.round(decimals * (measure * 2.5400013716002578512)) / decimals;
            case dimMilliMeter:
                return Math.round(decimals * (measure * 0.10000005400001014955)) / decimals;
            case dimCentiMeter:
                return measure;
            case dimMeter:
            default:
                return Math.round(decimals * 100 * measure) / decimals;
        }
    }

    /** Converts cm to dimensioning string.
     * @param cm Centi meter value to be converted.
     * @returns String representation.
     */
    static cmFromMeasure(measure) {
        switch (Configuration.getStringValue(configDimUnit)) {
            case dimFeetAndInch:
                return Math.round(decimals * (measure * 30.480016459203095991)) / decimals + 'cm';
            case dimInch:
                return Math.round(decimals * (measure * 2.5400013716002578512)) / decimals + 'cm';
            case dimMilliMeter:
                return Math.round(decimals * (measure * 0.10000005400001014955)) / decimals + 'cm';
            case dimCentiMeter:
                return measure;
            case dimMeter:
            default:
                return Math.round(decimals * 100 * measure) / decimals + 'cm';
        }
    }

    /** Converts cm to dimensioning string.
     * @param cm Centi meter value to be converted.
     * @returns String representation.
     */
    static cmToMeasureRaw(cm, power = 1) {
        switch (Configuration.getStringValue(configDimUnit)) {
            case dimFeetAndInch: // dimFeetAndInch returns only the feet
                var allInFeet = (cm * Math.pow(0.032808416666669996953, power));
                return allInFeet;
            case dimInch:
                var inches = Math.round(decimals * (cm * Math.pow(0.393700, power))) / decimals;
                return inches;
            case dimMilliMeter:
                var mm = Math.round(decimals * (cm * Math.pow(10, power))) / decimals;
                return mm;
            case dimCentiMeter:
                return Math.round(decimals * cm) / decimals;
            case dimMeter:
            default:
                var m = Math.round(decimals * (cm * Math.pow(0.01, power))) / decimals;
                return m;
        }
    }

    /** Converts cm to dimensioning string.
     * @param cm Centi meter value to be converted.
     * @returns String representation.
     */
    static cmToMeasure(cm, power = 1) {
        switch (Configuration.getStringValue(configDimUnit)) {
            case dimFeetAndInch:
                var allInFeet = (cm * Math.pow(0.032808416666669996953, power));
                var floorFeet = Math.floor(allInFeet);
                var remainingFeet = allInFeet - floorFeet;
                var remainingInches = Math.round(remainingFeet * 12);
                return floorFeet + '\'' + remainingInches + '';
            case dimInch:
                var inches = Math.round(decimals * (cm * Math.pow(0.393700, power))) / decimals;
                return inches + '\'';
            case dimMilliMeter:
                var mm = Math.round(decimals * (cm * Math.pow(10, power))) / decimals;
                return '' + mm + 'mm';
            case dimCentiMeter:
                return '' + Math.round(decimals * cm) / decimals + 'cm';
            case dimMeter:
            default:
                var m = Math.round(decimals * (cm * Math.pow(0.01, power))) / decimals;
                return '' + m + 'm';
        }
    }
}