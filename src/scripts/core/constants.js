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

export const defaultWallTexture = { color: '#FFFFFF', repeat: 50, normalmap: 'textures/Wall/Stylized-Sci-fi Wall-001/Stylized_Sci-fi_Wall_001_normal.jpg', ambientmap: 'textures/Wall/Stylized-Sci-fi Wall-001/Stylized_Sci-fi_Wall_001_ambientOcclusion.jpg', colormap: 'textures/Wall/Stylized-Sci-fi Wall-001/Stylized_Sci-fi_Wall_001_basecolor.jpg', roughnessmap: 'textures/Wall/Stylized-Sci-fi Wall-001/Stylized_Sci-fi_Wall_001_roughness.jpg' };