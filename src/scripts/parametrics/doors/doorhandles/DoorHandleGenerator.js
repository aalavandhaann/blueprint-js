import { Handle_01_vertices, Handle_01_faces } from './Handle_01';
import { Handle_02_vertices, Handle_02_faces } from './Handle_02';
import { Handle_03_vertices, Handle_03_faces } from './Handle_03';
import { Handle_04_vertices, Handle_04_faces } from './Handle_04';
import { Geometry, Matrix4, Vector3 } from 'three/build/three.module';


export class DoorHandleGenerator {

    static generate_handle(handleType, frontOrBack, doorSide, doorRatio, frame_width, frame_size, frame_thickness, doorOpenDirection, materialId) {
        let handle = null;
        switch (handleType) {
            case 'HANDLE_01':
                handle = DoorHandleGenerator.handle_model_01(materialId);
                break;
            case 'HANDLE_02':
                handle = DoorHandleGenerator.handle_model_02(materialId);
                break;
            case 'HANDLE_03':
                handle = DoorHandleGenerator.handle_model_03(materialId);
                break;
            case 'HANDLE_04':
                handle = DoorHandleGenerator.handle_model_04(materialId);
                break;
        }

        if (handle) {
            let side = 1;
            let sf = frame_size;
            let gap = 0.25; //0.002
            let wf = frame_width - (sf * 2) - (gap * 2);
            let deep = (frame_thickness * 0.5) - (gap * 3);

            let offset = 10;
            if (frontOrBack === 'Front') {
                handle.applyMatrix4(new Matrix4().makeRotationAxis(new Vector3(1, 0, 0), -Math.PI * 0.5));
                handle.applyMatrix4(new Matrix4().makeTranslation(0, 0, deep));
            } else {
                handle.applyMatrix4(new Matrix4().makeRotationAxis(new Vector3(1, 0, 0), Math.PI * 0.5));
                handle.applyMatrix4(new Matrix4().makeTranslation(0, 0, -deep));
            }
            if (doorSide === 'Right' && doorOpenDirection !== 'BOTH_SIDES') {
                handle.applyMatrix4(new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), Math.PI));
                handle.applyMatrix4(new Matrix4().makeTranslation(-offset, 0, 0));
            } else if (doorSide === 'Left' && doorOpenDirection !== 'BOTH_SIDES') {
                handle.applyMatrix4(new Matrix4().makeTranslation(offset, 0, 0));
            } else if (doorSide !== 'Right' && doorOpenDirection === 'BOTH_SIDES') {
                handle.applyMatrix4(new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), -Math.PI));
            }

            if (doorOpenDirection === 'BOTH_SIDES' && doorSide === 'Left') {
                handle.applyMatrix4(new Matrix4().makeTranslation((wf * doorRatio) - offset, 0, 0));
            }
            if (doorOpenDirection === 'BOTH_SIDES' && doorSide === 'Right') {
                handle.applyMatrix4(new Matrix4().makeTranslation((-wf * doorRatio) + offset, 0, 0));
            }

        }

        return handle;
    }

    //  ----------------------------------------------
    //  Handle model 01
    //  ----------------------------------------------
    static handle_model_01(materialId = 4) {
        let geometry = new Geometry();
        let vertices = [];
        let faces = [];
        Handle_01_vertices.forEach((vertex) => {
            vertices.push(vertex.clone());
        });
        Handle_01_faces.forEach((face) => {
            let face2 = face.clone();
            face2.materialIndex = materialId;
            faces.push(face2);
        });
        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.computeVertexNormals();
        geometry.computeFaceNormals();
        geometry.computeBoundingBox();
        return geometry;
    }

    static handle_model_02(materialId = 4) {
        let geometry = new Geometry();
        let vertices = [];
        let faces = [];
        Handle_02_vertices.forEach((vertex) => {
            vertices.push(vertex.clone());
        });
        Handle_02_faces.forEach((face) => {
            let face2 = face.clone();
            face2.materialIndex = materialId;
            faces.push(face2);
        });
        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.elementsNeedUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeFaceNormals();
        geometry.computeBoundingBox();
        return geometry;
    }


    static handle_model_03(materialId = 4) {
        let geometry = new Geometry();

        let vertices = [];
        let faces = [];
        Handle_03_vertices.forEach((vertex) => {
            vertices.push(vertex.clone());
        });
        Handle_03_faces.forEach((face) => {
            let face2 = face.clone();
            face2.materialIndex = materialId;
            faces.push(face2);
        });
        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.computeVertexNormals();
        geometry.computeFaceNormals();
        geometry.computeBoundingBox();
        return geometry;
    }

    static handle_model_04(materialId = 4) {
        let geometry = new Geometry();

        let vertices = [];
        let faces = [];
        Handle_04_vertices.forEach((vertex) => {
            vertices.push(vertex.clone());
        });
        Handle_04_faces.forEach((face) => {
            let face2 = face.clone();
            face2.materialIndex = materialId;
            faces.push(face2);
        });
        geometry.vertices = vertices;
        geometry.faces = faces;
        geometry.computeVertexNormals();
        geometry.computeFaceNormals();
        geometry.computeBoundingBox();
        return geometry;
    }
}