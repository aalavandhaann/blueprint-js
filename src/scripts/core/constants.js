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

export const TEXTURE_DEFAULT_REPEAT = 300;
export const defaultWallTexture = { color: '#FFFFFF', repeat: TEXTURE_DEFAULT_REPEAT, colormap: 'textures/Wall/Concrete_Wall_005_SD/Concrete_Wall_005_BaseColor.jpg', normalmap: 'textures/Wall/Concrete_Wall_005_SD/Concrete_Wall_005_Normal.jpg', bumpmap: 'textures/Wall/Concrete_Wall_005_SD/Concrete_Wall_005_Height.png', ambientmap: 'textures/Wall/Concrete_Wall_005_SD/Concrete_Wall_005_AmbientOcclusion.jpg', roughnessmap: 'textures/Wall/Concrete_Wall_005_SD/Concrete_Wall_005_Roughness.jpg' };
export const defaultFloorTexture = { color: '#FFFFFF', repeat: TEXTURE_DEFAULT_REPEAT, ambientmap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_ambientOcclusion.jpg', colormap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_basecolor.jpg', roughnessmap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_roughness.jpg', normalmap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_normal.jpg' };