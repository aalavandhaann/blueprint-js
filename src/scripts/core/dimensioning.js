import {Configuration, configDimUnit} from './configuration.js';
/** Dimensioning in Inch. */
export const dimInch = 'inch';

/** Dimensioning in Inch. */
export const dimFeetAndInch = 'feetAndInch';

/** Dimensioning in Meter. */
export const dimMeter = 'm';

/** Dimensioning in Centi Meter. */
export const dimCentiMeter = 'cm';

/** Dimensioning in Milli Meter. */
export const dimMilliMeter = 'mm';

export const decimals = 10;

/** Dimensioning functions. */
export class Dimensioning 
{	
	/** Converts cm to dimensioning number.
	 * @param cm Centi meter value to be converted.
	 * @returns Number representation.
	 */
	static cmFromMeasureRaw(measure)
	{
		switch (Configuration.getStringValue(configDimUnit)) 
		{
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
			return Math.round(decimals * measure) / decimals;
		}
	}
	
	/** Converts cm to dimensioning string.
	 * @param cm Centi meter value to be converted.
	 * @returns String representation.
	 */
	static cmFromMeasure(measure)
	{
		switch (Configuration.getStringValue(configDimUnit)) 
		{
		case dimFeetAndInch:
			return Math.round(decimals * (measure * 30.480016459203095991)) / decimals + 'cm';
		case dimInch:
			return Math.round(decimals * (measure * 2.5400013716002578512)) / decimals  + 'cm';
		case dimMilliMeter:
			return Math.round(decimals * (measure * 0.10000005400001014955)) / decimals + 'cm';
		case dimCentiMeter:
			return measure;
		case dimMeter:
		default:
			return Math.round(decimals * measure) / decimals + 'cm';
		}
	}
	
	/** Converts cm to dimensioning string.
	 * @param cm Centi meter value to be converted.
	 * @returns String representation.
	 */
	static cmToMeasureRaw(cm)
	{
		switch (Configuration.getStringValue(configDimUnit)) 
		{
		case dimFeetAndInch:// dimFeetAndInch returns only the feet
			var allInFeet = (cm * 0.032808416666669996953);
			return allInFeet;
		case dimInch:
			var inches = Math.round(decimals * (cm * 0.393700)) / decimals;
			return inches;
		case dimMilliMeter:
			var mm = Math.round(decimals * (10 * cm)) / decimals;
			return mm;
		case dimCentiMeter:
			return Math.round(decimals * cm) / decimals;
		case dimMeter:
		default:
			var m = Math.round(decimals * (cm)) / decimals;
			return m;
		}
	}
	
	/** Converts cm to dimensioning string.
	 * @param cm Centi meter value to be converted.
	 * @returns String representation.
	 */
	static cmToMeasure(cm)
	{
		switch (Configuration.getStringValue(configDimUnit)) 
		{
		case dimFeetAndInch:
			var allInFeet = (cm * 0.032808416666669996953);
			var floorFeet = Math.floor(allInFeet);
			var remainingFeet = allInFeet - floorFeet;
			var remainingInches = Math.round(remainingFeet * 12);
			return floorFeet + '" ' + remainingInches + '`';
		case dimInch:
			var inches = Math.round(decimals * (cm * 0.393700)) / decimals;
			return inches + '\'';
		case dimMilliMeter:
			var mm = Math.round(decimals * (10 * cm)) / decimals;
			return '' + mm + ' mm';
		case dimCentiMeter:
			return '' + Math.round(decimals * cm) / decimals + ' cm';
		case dimMeter:
		default:
			var m = Math.round(decimals * (cm  * 0.01)) / decimals;
			return '' + m + ' m';
		}
	}
}