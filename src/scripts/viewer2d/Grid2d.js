import { Configuration, gridSpacing } from '../core/configuration';
import { EVENT_CHANGED } from '../core/events';
import { Graphics } from 'pixi.js';
import { Vector2 } from 'three';
import { Dimensioning } from '../core/dimensioning';

const GRID_SIZE = 10000;

export class Grid2D extends Graphics {
    constructor(canvas, options) {
        super();
        // this.drawRect(0, 0, GRID_SIZE, GRID_SIZE);
        this.__canvasHolder = canvas;
        this.__options = options;
        this.__size = new Vector2(GRID_SIZE, GRID_SIZE);
        this.__gridScale = 1.0;
        this.width = this.__size.x;
        this.height = this.__size.y;
        this.drawRect(0, 0, GRID_SIZE, GRID_SIZE);
        this.pivot.x = this.pivot.y = 0.5;
        Configuration.getInstance().addEventListener(EVENT_CHANGED, (evt) => this.__updateGrid(evt.key));
        this.__updateGrid();
    }

    __updateGrid() {
        let spacingCMS = Configuration.getNumericValue(gridSpacing);
        let spacing = Dimensioning.cmToPixel(spacingCMS);
        let totalLines = GRID_SIZE / spacing;
        let halfSize = GRID_SIZE * 0.5;
        let linewidth = 1.0 / this.__gridScale;
        let highlightLineWidth = 1.0 / this.__gridScale;
        let normalColor = 0xEBEBEB;
        let highlightColor = 0xD0D0D0;
        this.clear();
        for (let i = 0; i < totalLines; i++) {
            let co = (i * spacing) - halfSize;
            if (i % 5 === 0) {
                this.lineStyle(highlightLineWidth, highlightColor).moveTo(-halfSize, co).lineTo(halfSize, co);
                this.lineStyle(highlightLineWidth, highlightColor).moveTo(co, -halfSize).lineTo(co, halfSize);
            } else {
                this.lineStyle(linewidth, normalColor).moveTo(-halfSize, co).lineTo(halfSize, co);
                this.lineStyle(linewidth, normalColor).moveTo(co, -halfSize).lineTo(co, halfSize);
            }

        }
    }

    get gridScale() {
        return this.__gridScale;
    }

    set gridScale(value) {
        this.__gridScale = value;
        this.__updateGrid();
    }

    __configurationUpdate(evt) {
        if (evt.key === gridSpacing) {
            this.__updateGrid();
        }
    }
}