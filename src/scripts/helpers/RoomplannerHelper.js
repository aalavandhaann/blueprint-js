import { Dimensioning } from "../core/dimensioning";
import { EVENT_CORNER_2D_CLICKED, EVENT_NOTHING_2D_SELECTED, EVENT_WALL_2D_CLICKED, EVENT_ROOM_2D_CLICKED, EVENT_NO_ITEM_SELECTED, EVENT_ITEM_SELECTED, EVENT_WALL_CLICKED, EVENT_ROOM_CLICKED } from "../core/events";

export class RoomPlannerHelper {
    constructor(floorplan, roomplanner) {
        this.__floorplan = floorplan;
        this.__roomplanner = roomplanner;

        this.__wallThickness = Dimensioning.cmToMeasureRaw(20);
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(250);
        this.__roomName = 'A New Room';

        this.__selectedWall = null;
        this.__selectedItem = null;
        this.__selectedRoom = null;
        this.__wallTexturePack = null;
        this.__floorTexturePack = null;

        this.__nothingSelectedEvent = this.__nothingSelected.bind(this);
        this.__itemSelectedEvent = this.__itemSelected.bind(this);
        this.__wallSelectedEvent = this.__wallSelected.bind(this);
        this.__roomSelectedEvent = this.__roomSelected.bind(this);

        this.__roomplanner.addRoomplanListener(EVENT_NO_ITEM_SELECTED, this.__nothingSelectedEvent);
        this.__roomplanner.addRoomplanListener(EVENT_ITEM_SELECTED, this.__itemSelectedEvent);
        this.__roomplanner.addRoomplanListener(EVENT_WALL_CLICKED, this.__wallSelectedEvent);
        this.__roomplanner.addRoomplanListener(EVENT_ROOM_CLICKED, this.__roomSelectedEvent);
    }

    __itemSelected(evt) {
        this.__selectedItem = evt.item;
    }

    __wallSelected(evt) {
        this.__selectedWall = evt.item;
        this.__wallThickness = Dimensioning.cmToMeasureRaw(evt.item.thickness);
    }

    __roomSelected(evt) {
        this.__selectedRoom = evt.item;
        this.__roomName = evt.item.name;
    }

    __nothingSelected() {
        // this.__selectedWall = null;
        // this.__selectedRoom = null;
        // this.__selectedItem = null;
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

    get wallTexturePack() {
        return this.__wallTexturePack;
    }

    set wallTexturePack(tpack) {
        this.__wallTexturePack = tpack;
        if (this.__selectedWall) {
            this.__selectedWall.setTextureMaps(tpack);
        }
    }

    get roomTexturePack() {
        return this.__roomTexturePack;
    }

    set roomTexturePack(tpack) {
        this.__roomTexturePack = tpack;
        if (this.__selectedRoom) {
            this.__selectedRoom.setTextureMaps(tpack);
        }
    }

}