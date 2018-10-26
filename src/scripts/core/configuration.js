import {dimInch} from './dimensioning.js';

// GENERAL:
/** The dimensioning unit for 2D floorplan measurements. */
export const configDimUnit = 'dimUnit';
// WALL:
/** The initial wall height in cm. */
export const configWallHeight = 'wallHeight';
/** The initial wall thickness in cm. */
export const configWallThickness = 'wallThickness';

/** Global configuration to customize the whole system.  */
export class Configuration 
{
	
	constructor()
	{
		/** Configuration data loaded from/stored to extern. */
		this.data = {dimUnit: dimInch,wallHeight: 250, wallThickness: 10};
	}
	
	static getData()
	{
		return {dimUnit: dimInch,wallHeight: 250, wallThickness: 10};
	}

	/** Set a configuration parameter. */
	static setValue(key, value) 
	{
		this.data[key] = value;
	}

	/** Get a string configuration parameter. */
	static getStringValue(key)
	{
		switch (key) 
		{
		case configDimUnit:
//			return String(this.data[key]);
			return String(Configuration.getData()[key]);
		default:
			throw new Error('Invalid string configuration parameter: ' + key);
		}
	}

	/** Get a numeric configuration parameter. */
	static getNumericValue(key)
	{
		switch (key) 
		{
		case configWallHeight:
		case configWallThickness:
//			return Number(this.data[key]);
			return Number(Configuration.getData()[key]);
		default:
			throw new Error('Invalid numeric configuration parameter: ' + key);
		}
	}
}