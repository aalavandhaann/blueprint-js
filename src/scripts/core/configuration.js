import {dimCentiMeter} from './dimensioning.js';


// GENERAL:
/** The dimensioning unit for 2D floorplan measurements. */
export var configDimUnit = 'dimUnit';
// WALL:
/** The initial wall height in cm. */
export const configWallHeight = 'wallHeight';
/** The initial wall thickness in cm. */
export const configWallThickness = 'wallThickness';

export const configSystemUI = 'systemUI';

export const scale = 'scale';

export const gridSpacing = 'gridSpacing';
export const snapToGrid = 'snapToGrid';
export const snapTolerance = 'snapTolerance';//In CMS

export var config = {dimUnit: dimCentiMeter, wallHeight: 250, wallThickness: 10, systemUI: false, scale: 1, snapToGrid: false, snapTolerance: 25, gridSpacing: 25};

export var wallInformation = {exterior: false, interior: false, midline: true, labels: true, exteriorlabel:'e:', interiorlabel:'i:', midlinelabel:'m:'};


/** 
 * The tolerance in cms between corners, otherwise below this tolerance they will snap together as one corner*/
export const cornerTolerance = 20;

/** Global configuration to customize the whole system.  */
export class Configuration
{
	constructor()
	{
		/** Configuration data loaded from/stored to extern. */
//		this.data = {dimUnit: dimCentiMeter, wallHeight: 250, wallThickness: 10};
	}
	
	static getData()
	{
//		return {dimUnit: dimCentiMeter,wallHeight: 250, wallThickness: 10};
		return config;
	}

	/** Set a configuration parameter. */
	static setValue(key, value) 
	{
//		this.data[key] = value;
		config[key] = value;
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
		case configSystemUI:
		case configWallHeight:
		case configWallThickness:
		case scale:
		case snapToGrid:
		case snapTolerance:
		case gridSpacing:
//			return Number(this.data[key]);
			return Number(Configuration.getData()[key]);
		default:
			throw new Error('Invalid numeric configuration parameter: ' + key);
		}
	}
}