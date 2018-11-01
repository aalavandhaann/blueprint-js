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

/** Dimensioning functions. */
export class Dimensioning 
{
	/** Converts cm to dimensioning string.
	 * @param cm Centi meter value to be converted.
	 * @returns String representation.
	 */
	static cmToMeasure(cm)
	{
		switch (Configuration.getStringValue(configDimUnit)) 
		{
		case dimFeetAndInch:
			var realFeet = ((cm * 0.393700) / 12);
			var feet = Math.floor(realFeet);
			var inches = Math.round((realFeet - feet) * 12);
			return feet + '`' + inches + '"';
		case dimInch:
			realFeet = ((cm * 0.393700) / 12);
			inches = Math.round(realFeet * 12);
			return inches + '"';
		case dimMilliMeter:
			return '' + Math.round(10 * cm) + ' mm';
		case dimCentiMeter:
			return '' + Math.round(10 * cm) / 10 + ' cm';
		case dimMeter:
		default:
			return '' + Math.round(10 * cm) / 1000 + ' m';
		}
	}
}