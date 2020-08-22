import Enum from "es6-enum";
import { DoorFactory } from "./doors/DoorFactory";

export const TYPE_DOOR = "DOOR";
export const TYPE_WINDOW = "WINDOW";
export const TYPE_CABINET = "CABINET";
export const TYPE_SHELVES = "SHELVES";

export const BASE_PARAMETRIC_TYPES = Enum(TYPE_DOOR, TYPE_WINDOW, TYPE_CABINET, TYPE_SHELVES);

export const BASE_PARAMETRIC_OBJECTS = { DOOR: DoorFactory };

/** Factory class to create items. */
export class ParametricFactory {
    /** Gets the class for the specified item. */
    static getParametricClass(parametricType) {
        let parametricClass = BASE_PARAMETRIC_OBJECTS[parametricType];
        if (parametricClass !== undefined) {
            return parametricClass;
        }
        throw new Error('Unimplemented parametric class error');
    }
}