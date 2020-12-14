import { ParametricBaseDoor } from "./ParametricBaseDoor";
import { ParametricDoorType2 } from "./ParametricDoorType2";
import { ParametricDoorType3 } from "./ParametricDoorType3";
import { ParametricDoorType4 } from "./ParametricDoorType4";
import { ParametricDoorType5 } from "./ParametricDoorType5";
import { ParametricDoorType6 } from "./ParametricDoorType6";

export const DOOR_TYPES = { 1: ParametricBaseDoor, 2: ParametricDoorType2, 3: ParametricDoorType3, 4: ParametricDoorType4, 5: ParametricDoorType5, 6: ParametricDoorType6 };

/** Factory class to create items. */
export class DoorFactory {
    /** Gets the class for the specified item. */
    static getClass(doorType) {
        return DOOR_TYPES[doorType];
    }
}