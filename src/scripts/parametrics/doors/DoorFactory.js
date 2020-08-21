import { ParametricBaseDoor } from "./ParametricBaseDoor";

export const DOOR_TYPES = { 1: ParametricBaseDoor };

/** Factory class to create items. */
export class DoorFactory {
    /** Gets the class for the specified item. */
    static getClass(doorType) {
        return DOOR_TYPES[doorType];
    }
}