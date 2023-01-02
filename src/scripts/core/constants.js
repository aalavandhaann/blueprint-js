import Enum from 'es6-enum';

/** Dimensioning in Inch. */
export const dimInch = 'inch';

/** Dimensioning in feetAndInch. */
export const dimFeetAndInch = 'feetAndInch';

/** Dimensioning in Feet. */
export const dimFeet = 'feet';

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
export const TEXTURE_DEFAULT_REFLECTIVE = 0.5;
export const TEXTURE_DEFAULT_SHININESS = 0.5;
export const TEXTURE_DEFAULT_ROTATION = 0;
//export const defaultWallTexture = { color: '#FFFFFF', repeat: TEXTURE_DEFAULT_REPEAT, normalmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_normal.jpg', roughnessmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_roughness.jpg', colormap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_basecolor.jpg', ambientmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_ambientOcclusion.jpg', bumpmap: 'textures/Wall/Brick_Wall_017_SD/Brick_Wall_017_height.png',rotation:TEXTURE_DEFAULT_ROTATION };
export const defaultWallTexture = { color: '#FFFFFF', repeat: TEXTURE_DEFAULT_REPEAT, colormap: 'textures/Wall/Indianwall/Wall.png',normalmap:'textures/Wall/Indianwall/Wall_normal.jpg',rotation:TEXTURE_DEFAULT_ROTATION };
export const defaultFloorTexture = { color: '#FFFFFF', emissive: '#181818', repeat: TEXTURE_DEFAULT_REPEAT, ambientmap: 'textures/Floor/Stone_Tiles_004/Stone_Tiles_004_ambientOcclusion.jpg', colormap: 'textures/Floor/Stone_Tiles_004/Stone_Tiles_004_basecolor.jpg', roughnessmap: 'textures/Floor/Stone_Tiles_004/Stone_Tiles_004_roughness.jpg', normalmap: 'textures/Floor/Stone_Tiles_004/Stone_Tiles_004_normal.jpg',rotation:TEXTURE_DEFAULT_ROTATION };

export const TEXTURE_PROPERTY_COLOR = 'color';
export const TEXTURE_PROPERTY_REPEAT = 'repeat';
export const TEXTURE_PROPERTY_ROTATE = 'rotation';
export const TEXTURE_PROPERTY_REFLECTIVE = 'reflective';
export const TEXTURE_PROPERTY_SHININESS = 'shininess';

export const DEFAULT_FONT_3D_PATH = 'font/helvetiker_regular.typeface.json';

export const TEXTURE_NO_PREVIEW = 'textures/NoPreview.jpg';
export const SPOT_LIGHT = 'SpotLight';
export const DIR_LIGHT = 'DirectionalLight';
export const POINT_LIGHT = 'PointLight';
export const RECT_LIGHT = 'RectAreaLight';
export const HEM_LIGHT = 'HemisphereLight';
export const AMB_LIGHT = 'AmbientLight';
export const SUN_LIGHT = 'SunLight';