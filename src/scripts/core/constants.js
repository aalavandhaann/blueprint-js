import Enum from 'es6-enum';

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

export const VIEW_TOP = 'topview';
export const VIEW_FRONT = 'frontview';
export const VIEW_RIGHT = 'rightview';
export const VIEW_LEFT = 'leftview';
export const VIEW_ISOMETRY = 'isometryview';

export const WallTypes = Enum('STRAIGHT', 'CURVED');