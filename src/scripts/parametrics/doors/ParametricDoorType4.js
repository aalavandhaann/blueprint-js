import { ParametricBaseDoor, DOOR_OPEN_DIRECTIONS } from "./ParametricBaseDoor";
import { Vector3, Face3 } from "three";

export class ParametricDoorType4 extends ParametricBaseDoor {
    constructor(parameters) {
        super(parameters);
        this.__doorType = 4;
    }

    /**
     * Based on the DoorType the below method will change
     * This can be replaced by the appropriate door model class
     * This method will change with logic based on the door model type
     */
    __createForDoorModel(frameWidth, openingDirection) {

        let gap = 0.25; //0.002;
        let sf = this.__frameSize;
        let wf = frameWidth - (sf * 2) - (gap * 2);
        let hf = (this.__frameHeight / 2) - (gap * 2);
        let deep = (this.__frameThickness * 0.5);

        let side = 0,
            minx = 0,
            maxx = 0;
        // # Open to right or left
        if (openingDirection === DOOR_OPEN_DIRECTIONS.RIGHT) {
            side = 1;
            minx = wf * -1;
            maxx = 0.0;
        } else {
            side = -1;
            minx = 0.0;
            maxx = wf;
        }
        let miny = 0.0; //# locked
        let maxy = deep;
        let minz = -hf;
        let maxz = hf - sf - gap;

        let myvertex = [new Vector3(minx, (-1.57160684466362e-08 * 100), minz + (2.384185791015625e-06 * 100)), new Vector3(maxx, (-1.5599653124809265e-08 * 100), minz), new Vector3(minx, (-1.5599653124809265e-08 * 100), maxz), new Vector3(minx, (-1.5599653124809265e-08 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(minx, (-1.57160684466362e-08 * 100), minz + (0.2500007152557373 * 100)), new Vector3(maxx, (-1.5599653124809265e-08 * 100), minz + (0.25000011920928955 * 100)), new Vector3(maxx, (-1.5599653124809265e-08 * 100), maxz), new Vector3(maxx, (-1.5599653124809265e-08 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(maxx - (0.11968576163053513 * 100), (-1.5599653124809265e-08 * 100), maxz), new Vector3(maxx - (0.11968576163053513 * 100), (-1.5599653124809265e-08 * 100), minz), new Vector3(maxx - (0.11968576163053513 * 100), (-1.5599653124809265e-08 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(maxx - (0.11968576163053513 * 100), (-1.5599653124809265e-08 * 100), minz + (0.25000011920928955 * 100)), new Vector3(minx + (0.12030857801437378 * 100), (-1.5832483768463135e-08 * 100), minz + (0.25000011920928955 * 100)), new Vector3(minx + (0.12030857801437378 * 100), (-1.5599653124809265e-08 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(minx + (0.12030857801437378 * 100), (-1.5832483768463135e-08 * 100), minz), new Vector3(minx + (0.12030857801437378 * 100), (-1.5599653124809265e-08 * 100), maxz), new Vector3(minx + (0.12030857801437378 * 100), (-0.010000014677643776 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(minx + (0.12030857801437378 * 100), (-0.010000014677643776 * 100), minz + (0.25000011920928955 * 100)), new Vector3(maxx - (0.11968576163053513 * 100), (-0.010000014677643776 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(maxx - (0.11968576163053513 * 100), (-0.010000014677643776 * 100), minz + (0.25000011920928955 * 100)), new Vector3(maxx - (0.1353275030851364 * 100), (-0.009388341568410397 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275030851364 * 100), (-0.009388341568410397 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(minx + (0.13506758213043213 * 100), (-0.009388341568410397 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275030851364 * 100), (-0.008776669390499592 * 100), minz + (0.26250016689300537 * 100)), new Vector3(minx + (0.13506758213043213 * 100), (-0.009388341568410397 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(maxx - (0.1353275030851364 * 100), (-0.0003883419558405876 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275030851364 * 100), (-0.0003883419558405876 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(minx + (0.13506758213043213 * 100), (-0.0003883419558405876 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275030851364 * 100), miny + (0.010223344899713993 * 100), minz + (0.26250016689300537 * 100)), new Vector3(minx + (0.13506758213043213 * 100), (-0.0003883419558405876 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(minx, maxy - (0.009999999776482582 * 100), minz + (2.384185791015625e-06 * 100)), new Vector3(maxx, maxy - (0.009999999776482582 * 100), minz), new Vector3(minx, maxy - (0.009999999776482582 * 100), maxz), new Vector3(minx, maxy - (0.009999999776482582 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(minx, maxy - (0.009999999776482582 * 100), minz + (0.2500007152557373 * 100)), new Vector3(maxx, maxy - (0.009999999776482582 * 100), minz + (0.25000011920928955 * 100)), new Vector3(maxx, maxy - (0.009999999776482582 * 100), maxz), new Vector3(maxx, maxy - (0.009999999776482582 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(maxx - (0.11968576908111572 * 100), maxy - (0.009999999776482582 * 100), maxz), new Vector3(maxx - (0.11968576908111572 * 100), maxy - (0.009999999776482582 * 100), minz), new Vector3(maxx - (0.11968576908111572 * 100), maxy - (0.009999999776482582 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(maxx - (0.11968576908111572 * 100), maxy - (0.009999999776482582 * 100), minz + (0.25000011920928955 * 100)), new Vector3(minx + (0.12030857801437378 * 100), maxy - (0.009999999776482582 * 100), minz + (0.25000011920928955 * 100)), new Vector3(minx + (0.12030857801437378 * 100), maxy - (0.009999999776482582 * 100), maxz - (0.12999999523162842 * 100)), new Vector3(minx + (0.12030857801437378 * 100), maxy - (0.009999999776482582 * 100), minz), new Vector3(minx + (0.12030857801437378 * 100), maxy - (0.009999999776482582 * 100), maxz), new Vector3(minx + (0.12030857801437378 * 100), maxy, maxz - (0.12999999523162842 * 100)), new Vector3(minx + (0.12030857801437378 * 100), maxy, minz + (0.25000011920928955 * 100)), new Vector3(maxx - (0.11968576908111572 * 100), maxy, maxz - (0.12999999523162842 * 100)), new Vector3(maxx - (0.11968576908111572 * 100), maxy, minz + (0.25000011920928955 * 100)), new Vector3(maxx - (0.1353275179862976 * 100), maxy - (0.0006116721779108047 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275179862976 * 100), maxy - (0.0006116721779108047 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(minx + (0.13506758213043213 * 100), maxy - (0.0006116721779108047 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275179862976 * 100), maxy - (0.0012233462184667587 * 100), minz + (0.26250016689300537 * 100)), new Vector3(minx + (0.13506758213043213 * 100), maxy - (0.0006116721779108047 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(maxx - (0.1353275179862976 * 100), maxy - (0.009611671790480614 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275179862976 * 100), maxy - (0.009611671790480614 * 100), maxz - (0.14747536182403564 * 100)), new Vector3(minx + (0.13506758213043213 * 100), maxy - (0.009611671790480614 * 100), minz + (0.26250016689300537 * 100)), new Vector3(maxx - (0.1353275179862976 * 100), maxy - (0.010223345831036568 * 100), minz + (0.26250016689300537 * 100)), new Vector3(minx + (0.13506758213043213 * 100), maxy - (0.009611671790480614 * 100), maxz - (0.14747536182403564 * 100))];

        let myfaces = [new Face3(0, 4, 12), new Face3(14, 0, 12), new Face3(3, 2, 15), new Face3(13, 3, 15), new Face3(10, 8, 6), new Face3(7, 10, 6), new Face3(13, 15, 8), new Face3(10, 13, 8), new Face3(14, 12, 11), new Face3(9, 14, 11), new Face3(9, 11, 5), new Face3(1, 9, 5), new Face3(16, 13, 10), new Face3(18, 16, 10), new Face3(19, 11, 12), new Face3(17, 19, 12), new Face3(12, 4, 3), new Face3(13, 12, 3), new Face3(10, 7, 5), new Face3(11, 10, 5), new Face3(17, 19, 23), new Face3(22, 17, 23), new Face3(20, 19, 18), new Face3(21, 20, 18), new Face3(24, 16, 17), new Face3(22, 24, 17), new Face3(13, 16, 17), new Face3(12, 13, 17), new Face3(18, 10, 11), new Face3(19, 18, 11), new Face3(16, 18, 21), new Face3(24, 16, 21), new Face3(29, 24, 22), new Face3(27, 29, 22), new Face3(29, 24, 21), new Face3(26, 29, 21), new Face3(25, 20, 21), new Face3(26, 25, 21), new Face3(27, 22, 23), new Face3(28, 27, 23), new Face3(27, 28, 25), new Face3(26, 29, 27), new Face3(27, 25, 26), new Face3(30, 34, 42), new Face3(44, 30, 42), new Face3(33, 32, 45), new Face3(43, 33, 45), new Face3(40, 38, 36), new Face3(37, 40, 36), new Face3(43, 45, 38), new Face3(40, 43, 38), new Face3(44, 42, 41), new Face3(39, 44, 41), new Face3(39, 41, 35), new Face3(31, 39, 35), new Face3(46, 43, 40), new Face3(48, 46, 40), new Face3(49, 41, 42), new Face3(47, 49, 42), new Face3(42, 34, 33), new Face3(43, 42, 33), new Face3(40, 37, 35), new Face3(41, 40, 35), new Face3(47, 49, 53), new Face3(52, 47, 53), new Face3(50, 49, 48), new Face3(51, 50, 48), new Face3(54, 46, 47), new Face3(52, 54, 47), new Face3(43, 46, 47), new Face3(42, 43, 47), new Face3(48, 40, 41), new Face3(49, 48, 41), new Face3(46, 48, 51), new Face3(54, 46, 51), new Face3(59, 54, 52), new Face3(57, 59, 52), new Face3(59, 54, 51), new Face3(56, 59, 51), new Face3(55, 50, 51), new Face3(56, 55, 51), new Face3(57, 52, 53), new Face3(58, 57, 53), new Face3(57, 58, 55), new Face3(56, 59, 57), new Face3(57, 55, 56), new Face3(8, 6, 36), new Face3(38, 8, 36), new Face3(15, 8, 38), new Face3(45, 15, 38), new Face3(45, 32, 2), new Face3(15, 45, 2), new Face3(37, 36, 6), new Face3(7, 37, 6), new Face3(35, 37, 7), new Face3(5, 35, 7), new Face3(5, 1, 31), new Face3(35, 5, 31), new Face3(39, 31, 1), new Face3(9, 39, 1), new Face3(44, 39, 9), new Face3(14, 44, 9), new Face3(14, 0, 30), new Face3(44, 14, 30), new Face3(3, 4, 34), new Face3(33, 3, 34), new Face3(3, 2, 32), new Face3(33, 3, 32), new Face3(0, 4, 34), new Face3(30, 0, 34)];

        let normal_ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
        let glass_ids = [];
        let i = 0;
        for (i = 0; i < normal_ids.length; i++) { myfaces[normal_ids[i]].materialIndex = this.__doorMaterialId; }
        for (i = 0; i < glass_ids.length; i++) { myfaces[glass_ids[i]].materialIndex = this.__glassMaterialId; }



        return { vertices: myvertex, faces: myfaces, widthFactor: wf, depth: deep, side: side };
    }
}