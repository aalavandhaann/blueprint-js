import { Mesh, Object3D, Raycaster } from "three";
import { ArrowHelper, Matrix4, Vector3 } from "three";
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { configDimUnit, Configuration, itemStatistics } from "../core/configuration";
import { Dimensioning } from "../core/dimensioning";
import { EVENT_CHANGED, EVENT_ITEM_SELECTED, EVENT_NO_ITEM_SELECTED, EVENT_UPDATED } from "../core/events";

export class StatisticArrow extends Object3D{
    constructor(dir, origin, length, hexColor, headLength, headWidth, textColor = 0xFFFFFF ){
        super();
        let textElements = null;
        this.__arrowDirection = dir.clone();
        this.__reverseArrowDirection = dir.clone().negate();
        this.__arrowLength = length;
        this.__arrowColor = hexColor;
        this.__arrowHeadLength = headLength;
        this.__arrowHeadWidth = headWidth;

        textElements = this.__createTextElement();
        this.__textElement = textElements['three-element'];
        this.__textDomElement = textElements['dom-element'];

        this.__arrow = new ArrowHelper(dir, origin, length, hexColor, headLength, headWidth);
        this.__reverseArrow = new ArrowHelper(this.__reverseArrowDirection, origin, length, hexColor, headLength, headWidth);
        
        this.__updatedEvent = this.__updated.bind(this);

        this.add(this.__arrow);
        this.add(this.__reverseArrow);
        this.add(this.__textElement);
        

        Configuration.getInstance().addEventListener(EVENT_CHANGED, this.__updatedEvent);
    }

    __createTextElement(){
        let parentElement = document.getElementById('viewer3d-measurement-labels');
        if(!parentElement){
            parentElement = document.createElement('div');
            parentElement.id = 'viewer3d-measurement-labels'
            document.body.appendChild(parentElement);
        }
        let labelElement = document.createElement('div');
        let label3D = new CSS2DObject(labelElement);
        
        labelElement.className = 'viewer3d-measurement-labels';
        labelElement.textContent = 'label';
        labelElement.style.marginTop = '-1em';

        parentElement.appendChild(labelElement);

        return {'three-element': label3D, 'dom-element': labelElement};
    }

    __updated(evt){
        if(evt.key === configDimUnit){
            this.setLength();
        }
        this.setLength();
        this.__textElement.visible = Configuration.getBooleanValue(itemStatistics);
    }

    __fontLoaded(font){
        this.__fontConfig.font = font;
        this.setLength();
    }

    __updateText(evt){
        let label = `${Dimensioning.cmToMeasure(this.__arrowLength)}`;
        let center = this.__arrowDirection.clone().multiplyScalar(this.__arrowLength * 0.5);
        center.y += 5;
        this.__textDomElement.textContent = label;
        this.__textElement.position.copy(center);
    }

    setLength(length, headLength, headWidth){
        this.__arrowLength = (length) ? length : this.__arrowLength;
        this.__arrowHeadLength = (headLength) ? headLength : this.__arrowHeadLength;
        this.__arrowHeadWidth = (headWidth) ? headWidth : this.__arrowHeadWidth;
        this.__arrow.setLength(this.__arrowLength, this.__arrowHeadLength, this.__arrowHeadWidth);
        this.__reverseArrow.setLength(this.__arrowLength, this.__arrowHeadLength, this.__arrowHeadWidth);
        this.__reverseArrow.position.copy(this.__arrowDirection.clone().multiplyScalar(this.__arrowLength));
        this.__updateText();
    }

    setColor(color){
        this.__arrowColor = color;
        this.__arrow.setColor(this.__arrowColor);
        this.__reverseArrow.setColor(this.__arrowColor);
    }

    setDirection(dir){
        this.__arrowDirection = dir.clone();
        this.__reverseArrowDirection = dir.clone().negate();
        this.__arrow.setDirection(this.__arrowDirection);
        this.__reverseArrow.setDirection(this.__reverseArrowDirection);
        this.setLength();
    }

    setTextColor(color){
        this.__textColor = color;
        this.__textMaterial.color = color;
    }
}

export class ItemStatistics3D extends Mesh {
    constructor(physicalItem, dragControls, opts) {
        super();
        let options = {
            dimension: {
                headLength: 5,
                headWidth: 7,
                unselectedColor: 0xFF0000,
                selectedColor: 0x00F0F0
            },
            distance: {
                headLength: 5,
                headWidth: 7,
                unselectedColor: 0xFF0000,
                selectedColor: 0x00F0F0
            }
        };
        for (let opt in options) {
            if (opts.hasOwnProperty(opt)) {
                if(typeof opts[opt] !== 'object'){
                    options[opt] = opts[opt];
                    continue;
                }
                for (let iOpt in options[opt]){
                    if(opts[opt].hasOwnProperty(iOpt)){
                        options[opt][iOpt] = opts[opt][iOpt];
                    }
                }                
            }
        }
        this.__options = options;
        this.__physicalItem = physicalItem;
        this.__dragControls = dragControls;

        this.__itemModel = physicalItem.itemModel;
        this.__dragControls = dragControls;
        this.__model = this.__itemModel.model;
        this.__itemHalfSize = this.__physicalItem.box.getSize(new Vector3()).multiplyScalar(0.5);

        this.__raycaster = new Raycaster();

        this.__up = new Vector3(0, 1, 0);
        this.__down = new Vector3(0, -1, 0);

        this.__left = new Vector3(-1, 0, 0);
        this.__right = new Vector3(1, 0, 0);

        this.__front = new Vector3(0, 0, 1);
        this.__back = new Vector3(0, 0, -1);

        this.__widthLinePosition = new Vector3(-1, 1, 1);
        this.__heightLinePosition = new Vector3(1, -1, 1);
        this.__depthLinePosition = new Vector3(1, 1, 1);

        this.__upArrow = new StatisticArrow(this.__up.clone(),
            new Vector3(), 1,
            this.__options.distance.unselectedColor,
            this.__options.distance.headLength,
            this.__options.distance.headWidth
        );
        this.__downArrow = new StatisticArrow(this.__down.clone(),
            new Vector3(), 1,
            this.__options.distance.unselectedColor,
            this.__options.distance.headLength,
            this.__options.distance.headWidth
        );

        this.__leftArrow = new StatisticArrow(this.__left.clone(),
            new Vector3(), 1,
            this.__options.distance.unselectedColor,
            this.__options.distance.headLength,
            this.__options.distance.headWidth
        );
        this.__rightArrow = new StatisticArrow(this.__right.clone(),
            new Vector3(), 1,
            this.__options.distance.unselectedColor,
            this.__options.distance.headLength,
            this.__options.distance.headWidth
        );

        this.__frontArrow = new StatisticArrow(this.__front.clone(),
            new Vector3(), 1,
            this.__options.distance.unselectedColor,
            this.__options.distance.headLength,
            this.__options.distance.headWidth
        );
        this.__backArrow = new StatisticArrow(this.__back.clone(),
            new Vector3(), 1,
            this.__options.distance.unselectedColor,
            this.__options.distance.headLength,
            this.__options.distance.headWidth
        );

        this.__widthArrow = new StatisticArrow(new Vector3(1, 0, 0),
            new Vector3(), 50,
            this.__options.dimension.unselectedColor,
            this.__options.dimension.headLength,
            this.__options.dimension.headWidth
        );
        this.__heightArrow = new StatisticArrow(new Vector3(0, 1, 0),
            new Vector3(), 1,
            this.__options.dimension.unselectedColor,
            this.__options.dimension.headLength,
            this.__options.dimension.headWidth
        );
        this.__depthArrow = new StatisticArrow(new Vector3(0, 0, -1),
            new Vector3(), 1,
            this.__options.dimension.unselectedColor,
            this.__options.dimension.headLength,
            this.__options.dimension.headWidth
        );

        this.__directions = [
            this.__up, this.__down,
            this.__front, this.__back,
            this.__left, this.__right
        ];

        this.__directionArrows = [
            this.__upArrow, this.__downArrow,
            this.__frontArrow, this.__backArrow,
            this.__leftArrow, this.__rightArrow
        ];
        
        this.add(this.__upArrow);
        this.add(this.__downArrow);

        this.add(this.__leftArrow);
        this.add(this.__rightArrow);

        this.add(this.__frontArrow);
        this.add(this.__backArrow);

        this.add(this.__widthArrow);
        this.add(this.__heightArrow);
        this.add(this.__depthArrow);

        this.__deselectEvent = this.__deselected.bind(this);
        this.__configurationChangedEvent = this.__configurationChanged.bind(this);
        this.visible = Configuration.getBooleanValue(itemStatistics);
        this.__dragControls.addEventListener(EVENT_NO_ITEM_SELECTED, this.__deselectEvent);
        this.__dragControls.addEventListener(EVENT_ITEM_SELECTED, this.__deselectEvent);
        Configuration.getInstance().addEventListener(EVENT_CHANGED, this.__configurationChangedEvent);
    }

    __updateDimensionStatistics() {
        let wPos = this.__widthLinePosition.clone().multiply(this.__itemHalfSize);
        let hPos = this.__heightLinePosition.clone().multiply(this.__itemHalfSize);
        let dPos = this.__depthLinePosition.clone().multiply(this.__itemHalfSize);

        this.__widthArrow.setLength(this.__itemHalfSize.x*2, this.__options.dimension.headLength, this.__options.dimension.headWidth);
        this.__heightArrow.setLength(this.__itemHalfSize.y*2, this.__options.dimension.headLength, this.__options.dimension.headWidth);
        this.__depthArrow.setLength(this.__itemHalfSize.z*2, this.__options.dimension.headLength, this.__options.dimension.headWidth);

        this.__widthArrow.position.copy(wPos);
        this.__heightArrow.position.copy(hPos);
        this.__depthArrow.position.copy(dPos);
        if(this.__physicalItem.selected){
            this.__widthArrow.setColor(this.__options.dimension.selectedColor);
            this.__heightArrow.setColor(this.__options.dimension.selectedColor);
            this.__depthArrow.setColor(this.__options.dimension.selectedColor);
        }
        else{
            this.__widthArrow.setColor(this.__options.dimension.unselectedColor);
            this.__heightArrow.setColor(this.__options.dimension.unselectedColor);
            this.__depthArrow.setColor(this.__options.dimension.unselectedColor);
        }
    }

    __updateDistanceStatistics() {
        function excludeThyself(physicalItem, allItems){
            let items = [];
            allItems.forEach((item) =>{
                if(item !== physicalItem){
                    if(item.loadedItem){
                        items.push(item.loadedItem);
                    }                    
                }
            });
            return items;
        }
        let i;
        let intersectionsWithPlanes = [];
        let physicalItems = excludeThyself(this.__physicalItem, this.__physicalItem.parent.physicalRoomItems);
        intersectionsWithPlanes = intersectionsWithPlanes.concat(this.__model.floorplan.floorPlanesForIntersection);
        intersectionsWithPlanes = intersectionsWithPlanes.concat(this.__model.floorplan.wallPlanesForIntersection);
        intersectionsWithPlanes = intersectionsWithPlanes.concat(this.__model.floorplan.roofPlanesForIntersection);
        intersectionsWithPlanes = intersectionsWithPlanes.concat(physicalItems);
        this.updateMatrixWorld();
        for (i = 0;i < this.__directions.length;i++){
            let intersections = [];
            let direction = this.__directions[i].clone();
            let arrow = this.__directionArrows[i];
            let location = direction.clone().multiply(this.__itemHalfSize);
            let intersectionData = null;
            let rotMatrix = new Matrix4();
            let worldLocation = location.clone();
            let transformedDirection = direction.clone();


            rotMatrix.extractRotation(this.matrixWorld);
            transformedDirection.applyMatrix4(rotMatrix);
            transformedDirection.normalize(); 

            worldLocation.applyMatrix4(rotMatrix);
            worldLocation.add(this.__physicalItem.position);
            
            this.__raycaster.set(worldLocation, transformedDirection);
            intersections = this.__raycaster.intersectObjects(intersectionsWithPlanes, true);

            if(intersections.length){
                intersectionData = intersections[0];
                arrow.setLength(intersectionData.distance);
            }
            arrow.position.copy(location);
            let flag = arrow.visible;
            arrow.visible = false;
            arrow.visible = flag;
        }
    }

    __deselected(evt){
        if(!this.__physicalItem.selected){
            this.turnOffDistances();
        }        
    }

    __configurationChanged(evt) {
        if (evt.key !== itemStatistics) {
            return;
        }
        this.visible = Configuration.getBooleanValue(itemStatistics);
        if(!this.visible){
            return;
        }
    }

    updateDimensions(){
        this.__updateDimensionStatistics();
    }

    updateDistances(){
        this.__updateDistanceStatistics();
    }

    turnOffDistances(){
        this.__directionArrows.forEach((arrow) =>{
            arrow.visible = false;
        });
    }

    turnOnDistances(){
        this.__directionArrows.forEach((arrow) =>{
            arrow.visible = true;
        });
    }

    turnOffDimensions(){
        this.__widthArrow.visible = false;
        this.__heightArrow.visible = false;
        this.__depthArrow.visible = false;
    }

    turnOnDimensions(){
        this.__widthArrow.visible = true;
        this.__heightArrow.visible = true;
        this.__depthArrow.visible = true;
    }
}