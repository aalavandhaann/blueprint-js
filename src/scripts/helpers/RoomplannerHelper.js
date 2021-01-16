import { TEXTURE_PROPERTY_COLOR } from "../core/constants";
import { Dimensioning } from "../core/dimensioning";
import { EVENT_CORNER_2D_CLICKED, EVENT_NOTHING_2D_SELECTED, EVENT_WALL_2D_CLICKED, EVENT_ROOM_2D_CLICKED, EVENT_NO_ITEM_SELECTED, EVENT_ITEM_SELECTED, EVENT_WALL_CLICKED, EVENT_ROOM_CLICKED } from "../core/events";
import { InWallFloorItem } from "../items/in_wall_floor_item";

export class RoomPlannerHelper {
    constructor(model, floorplan, roomplanner) {
        this.__model = model;
        this.__floorplan = floorplan;
        this.__roomplanner = roomplanner;

        this.__wallThickness = Dimensioning.cmToMeasureRaw(20);
        this.__cornerElevation = Dimensioning.cmToMeasureRaw(250);
        this.__roomName = 'A New Room';

        this.__selectedEdge = null;
        this.__selectedEdgeNormal = null;
        this.__selectedEdgePoint = null;

        this.__selectedItem = null;
        this.__selectedRoom = null;
        this.__wallTexturePack = null;
        this.__roomTexturePack = null;
        this.__roomWallsTexturePack = null;

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
        this.__selectedEdge = evt.item;
        this.__selectedEdgeNormal = evt.normal;
        this.__selectedEdgePoint = evt.point;
        this.__wallThickness = Dimensioning.cmToMeasureRaw(evt.item.thickness);
    }

    __roomSelected(evt) {
        this.__selectedRoom = evt.item;
        this.__roomName = evt.item.name;
    }

    __nothingSelected() {
        // this.__selectedEdge = null;
        // this.__selectedRoom = null;
        // this.__selectedItem = null;
    }

    addParametricDoorToCurrentWall(doorType) {
        if (!this.__selectedEdge) {
            return;
        }

        let itemMetaData = {
            itemName: "Parametric Door",
            isParametric: true,
            baseParametricType: "DOOR",
            subParametricData: {
                type: doorType,
                frameColor: "#E7E7E7",
                doorColor: "#E7E7E7",
                doorHandleColor: '#F0F0F0',
                glassColor: '#87CEEB',
                frameWidth: 100,
                frameHeight: 200,
                frameSize: 5,
                frameThickness: 20,
                doorRatio: 0.5,
                openDirection: "RIGHT",
                handleType: "HANDLE_01"
            },
            itemType: 7,
            position: [
                0,
                0,
                0
            ],
            rotation: [
                0,
                0,
                0
            ],
            scale: [
                1,
                1,
                1
            ],
            size: [
                100,
                200,
                20
            ],
            fixed: false,
            resizable: false,
            wall: this.__selectedEdge.id,
        };

        let item = new InWallFloorItem(itemMetaData, this.__model);
        this.__model.addItem(item);
        // console.log(this.__selectedEdgePoint, this.__selectedEdgeNormal);
        item.snapToWall(this.__selectedEdgePoint, this.__selectedEdge.wall, this.__selectedEdge);
    }

    set wallThickness(value) {
        if (this.__selectedEdge) {
            let cms = Dimensioning.cmFromMeasureRaw(value);
            this.__selectedEdge.thickness = cms;
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
        if (this.__selectedEdge) {
            this.__selectedEdge.setTextureMaps(tpack);
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

    get roomWallsTexturePack() {
        return this.__roomWallsTexturePack;
    }

    set roomWallsTexturePack(tpack) {
        this.__roomTexturePack = tpack;
        if (this.__selectedRoom) {
            this.__selectedRoom.setRoomWallsTextureMaps(tpack);
        }
    }

    setWallColor(color){
        if(this.__selectedEdge){
            this.__selectedEdge.setTextureMapAttribute(TEXTURE_PROPERTY_COLOR, color);
        }
    }

    setRoomWallsTextureColor(color){
        if(this.__selectedRoom){
            this.__selectedRoom.setRoomWallsTextureMapsAttribute(TEXTURE_PROPERTY_COLOR, color);
        }
    }

    setRoomFloorColor(color){
        if(this.__selectedRoom){
            this.__selectedRoom.setTextureMapAttribute(TEXTURE_PROPERTY_COLOR, color);
        }
    } 
}