import { BaseFloorplanViewElement2D } from './BaseFloorplanViewElement2D.js';
import { EVENT_ROOM_ATTRIBUTES_CHANGED, EVENT_CHANGED } from '../core/events.js';
import { Dimensioning } from '../core/dimensioning.js';
import { Configuration } from '../core/configuration.js';
import { Vector2 } from 'three';
import { Text } from 'pixi.js';

export class RoomView2D extends BaseFloorplanViewElement2D {
    constructor(floorplan, options, room) {
        super(floorplan, options);
        this.__room = room;
        this.__updatedRoomEvent = this.__drawUpdatedRoom.bind(this);

        this.__roomNameField = new Text('Room Name ', { fontFamily: 'Arial', fontSize: 14, fill: '#000000', align: 'left' });
        this.__roomAreaField = new Text('Room Area ', { fontFamily: 'Arial', fontSize: 14, fill: '#000000', align: 'left' });

        this.__roomAreaField.alpha = 0.5;
        this.__roomNameField.alpha = 0.5;

        this.interactive = room.isLocked;
        this.buttonMode = room.isLocked;

        if (room.isLocked) {
            this.__deactivate();
        }

        this.addChild(this.__roomNameField);
        this.addChild(this.__roomAreaField);
        this.__room.addEventListener(EVENT_ROOM_ATTRIBUTES_CHANGED, this.__updatedRoomEvent);
        this.__room.addEventListener(EVENT_CHANGED, this.__updatedRoomEvent);
        Configuration.getInstance().addEventListener(EVENT_CHANGED, this.__updatedRoomEvent);
        this.__drawUpdatedLabel();
        this.__mouseOut();
    }

    __drawUpdatedLabel() {
        let roomCenter = this.__room.areaCenter;
        let area = Math.round(this.__room.area * 100) / 100;
        // let measure = Dimensioning.cmToMeasure(parseInt(area), 2);
        let measure = Dimensioning.cmToMeasure(area.toFixed(1), 2);
        let offset = 15;
        this.__roomNameField.position.x = this.__roomAreaField.position.x = Dimensioning.cmToPixel(roomCenter.x);
        this.__roomNameField.position.y = Dimensioning.cmToPixel(roomCenter.y) - offset;
        this.__roomAreaField.position.y = Dimensioning.cmToPixel(roomCenter.y) + offset;
        this.__roomAreaField.text = measure + '\xB2';
        this.__roomNameField.text = this.__room.name;

        this.__roomNameField.anchor.set(0.5, 0.5);
        this.__roomAreaField.anchor.set(0.5, 0.5);
    }

    __drawUpdatedRoom() {
        this.__drawUpdatedLabel();
        this.__drawPolygon();
        this.__drawHoveredOffState();
    }

    __drawPolygon(color, alpha = 1.0) {
        let points = [];
        this.clear();
        this.beginFill(color, alpha);

        // this.__room.interiorCorners.forEach((corner) => {
        //     points.push(new Vector2(corner.x, corner.y));
        // });
        this.__room.corners.forEach((corner) => {
            points.push(new Vector2(corner.x, corner.y));
        });

        for (let i = 0; i < points.length; i++) {
            let x = Dimensioning.cmToPixel(points[i].x);
            let y = Dimensioning.cmToPixel(points[i].y);
            if (i === 0) {
                this.moveTo(x, y);
            } else {
                this.lineTo(x, y);
            }
        }
        this.endFill();
    }

    __drawSelectedState() {
        this.__drawPolygon(0x00BA8C, 1.0);
    }
    __drawHoveredOnState() {
        this.__drawPolygon(0x008CBA, 1.0);
    }
    __drawHoveredOffState() {
        this.__drawPolygon(0xFEDAFF, 1.0);
    }

    remove() {
        this.__room.removeEventListener(EVENT_ROOM_ATTRIBUTES_CHANGED, this.__updatedRoomEvent);
        this.__room.removeEventListener(EVENT_CHANGED, this.__updatedRoomEvent);
        Configuration.getInstance().removeEventListener(EVENT_CHANGED, this.__updatedRoomEvent);
        super.remove();
    }

    get room() {
        return this.__room;
    }
}