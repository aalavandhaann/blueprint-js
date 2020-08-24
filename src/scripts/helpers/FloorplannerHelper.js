import { Dimensioning } from "../core/dimensioning";
import { EVENT_CORNER_2D_CLICKED, EVENT_NOTHING_2D_SELECTED, EVENT_WALL_2D_CLICKED, EVENT_ROOM_2D_CLICKED } from "../core/events";

export class FloorPlannerHelper {
    constructor(floorplan, floorplanner) {
        this.__floorplan = floorplan;
        this.__floorplanner = floorplanner;

        this.__wallThickness = Dimensioning.cmToMeasureRaw(20);
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(250);
        this.__roomName = 'A New Room';

        /**
         * Store a reference to the model entities
         */
        this.__selectedWall = null;
        this.__selectedCorner = null;
        this.__selectedRoom = null;

        /**
         * Store a reference to the viewer3d visual entities
         */
        this.__selectedWallEntity = null;
        this.__selectedCornerEntity = null;
        this.__selectedRoomEntity = null;

        this.__nothingSelectedEvent = this.__resetSelections.bind(this);
        this.__cornerSelectedEvent = this.__cornerSelected.bind(this);
        this.__wallSelectedEvent = this.__wallSelected.bind(this);
        this.__roomSelectedEvent = this.__roomSelected.bind(this);

        this.__floorplanner.addFloorplanListener(EVENT_NOTHING_2D_SELECTED, this.__nothingSelectedEvent);
        this.__floorplanner.addFloorplanListener(EVENT_CORNER_2D_CLICKED, this.__cornerSelectedEvent);
        this.__floorplanner.addFloorplanListener(EVENT_WALL_2D_CLICKED, this.__wallSelectedEvent);
        this.__floorplanner.addFloorplanListener(EVENT_ROOM_2D_CLICKED, this.__roomSelectedEvent);
    }

    __resetSelections() {
        this.__selectedCorner = null;
        this.__selectedWall = null;
        this.__selectedRoom = null;
        this.__selectedCornerEntity = null;
        this.__selectedWallEntity = null;
        this.__selectedRoomEntity = null;
    }

    __cornerSelected(evt) {
        this.__resetSelections();
        this.__selectedCorner = evt.item;
        this.__selectedCornerEntity = evt.entity;
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(this.__selectedCorner.elevation);
    }

    __wallSelected(evt) {
        this.__resetSelections();
        this.__selectedWall = evt.item;
        this.__selectedWallEntity = evt.entity;
        this.__wallThickness = Dimensioning.cmToMeasureRaw(evt.item.thickness);
    }

    __roomSelected(evt) {
        this.__resetSelections();
        this.__selectedRoom = evt.item;
        this.__selectedRoomEntity = evt.entity;
        this.__roomName = evt.item.name;
    }

    __nothingSelected() {
        this.__resetSelections();
    }

    deleteCurrentItem() {
        if (this.__selectedWall) {
            this.__selectedWall.remove();
            this.__resetSelections();
        }
        if (this.__selectedCorner) {
            this.__selectedCorner.remove();
            this.__resetSelections();
        }
    }

    set wallThickness(value) {
        if (this.__selectedWall) {
            let cms = Dimensioning.cmFromMeasureRaw(value);
            this.__selectedWall.thickness = cms;
            this.__wallThickness = value;
        }
    }
    get wallThickness() {
        return Dimensioning.cmToMeasureRaw(this.__wallThickness);
    }

    set cornerElevation(value) {
        if (this.__selectedCorner) {
            let cms = Dimensioning.cmFromMeasureRaw(value);
            this.__selectedCorner.elevation = cms;
            this.__cornerElevation = value;
        }
    }
    get cornerElevation() {
        return Dimensioning.cmToMeasureRaw(this.__cornerElevation);
    }

    set roomName(value) {
        if (this.__selectedRoom) {
            this.__selectedRoom.name = value;
            this.__roomName = value;
        }
    }
    get roomName() {
        return this.__roomName;
    }

}