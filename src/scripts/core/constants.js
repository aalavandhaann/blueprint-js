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
export const defaultWallTexture = { color: '#FFFFFF', repeat: TEXTURE_DEFAULT_REPEAT, normalmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_normal.jpg', roughnessmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_roughness.jpg', colormap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_basecolor.jpg', ambientmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_ambientOcclusion.jpg', bumpmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_height.png' };
export const defaultFloorTexture = { color: '#FFFFFF', emissive: '#181818', repeat: TEXTURE_DEFAULT_REPEAT, ambientmap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_ambientOcclusion.jpg', colormap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_basecolor.jpg', roughnessmap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_roughness.jpg', normalmap: 'textures/Floor/Marble_Tiles_001/Marble_Tiles_001_normal.jpg' };

export const TEXTURE_PROPERTY_COLOR = 'color';
export const TEXTURE_NO_PREVIEW = 'textures/NoPreview.jpg';