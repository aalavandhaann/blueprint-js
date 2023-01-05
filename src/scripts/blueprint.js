import { Configuration, configDimUnit } from "./core/configuration";
import { dimCentiMeter } from "./core/constants";
import { Model } from "./model/model";
import { Viewer3D } from "./viewer3d/Viewer3d";
import { Viewer2D, floorplannerModes } from "./viewer2d/Viewer2D";
import { ConfigurationHelper } from "./helpers/ConfigurationHelper";
import { FloorPlannerHelper } from "./helpers/FloorplannerHelper";
import { RoomPlannerHelper } from "./helpers/RoomplannerHelper";

///** BlueprintJS core application. */
class BlueprintJS {
    /**
     * Creates an instance of BlueprintJS. This is the entry point for the application
     *
     * @param {Object} - options The initialization options.
     * @param {string} options.floorplannerElement - Id of the html element to use as canvas. Needs to exist in the html
     * @param {string} options.threeElement - Id of the html element to use as canvas. Needs to exist in the html and should be #idofhtmlelement
     * @param {string} options.threeCanvasElement - Id of the html element to use as threejs-canvas. This is created automatically
     * @param {string} options.textureDir - path to texture directory. No effect
     * @param {boolean} options.widget - If widget mode then disable the controller from interactions
     * @example
     * let blueprint3d = new BP3DJS.BlueprintJS(opts);
     */
    constructor(options) {
        Configuration.setValue(configDimUnit, dimCentiMeter);

        // console.log('BLUEPRINT JS :: OPTIONS ::: ', options);

        /**
         * @property {Object} options
         * @type {Object}
         **/
        this.options = options;
        /**
         * @property {Model} model
         * @type {Model}
         **/
        this.model = new Model(options.textureDir);
        /**
         * @property {Main} three
         * @type {Main}
         **/
        // this.three = new Main(this.model, options.threeElement, options.threeCanvasElement, {});
        /**
         * @property {Main} three
         * @type {Main}
         **/
        let viewer3dOptions = this.options.viewer3d.viewer3dOptions || {};

        // console.log('OPTIONS ::: ', this.options);
        viewer3dOptions.resize = (this.options.resize) ? true : false;
        this.roomplanner = new Viewer3D(this.model, options.viewer3d.id, viewer3dOptions);

        this.configurationHelper = new ConfigurationHelper();
        this.floorplanningHelper = null;
        this.roomplanningHelper = new RoomPlannerHelper(this.model, this.model.floorplan, this.roomplanner);
        if (!options.widget) {
            /**
             * @property {Floorplanner2D} floorplanner
             * @type {Floorplanner2D}
             **/
            // this.floorplanner = new Floorplanner2D(options.floorplannerElement, this.model.floorplan);
            let viewer2dOptions = this.options.viewer2d.viewer2dOptions || {};
            viewer2dOptions.resize = (this.options.resize) ? true : false;
            this.floorplanner = new Viewer2D(options.viewer2d.id, this.model.floorplan, viewer2dOptions);
            this.floorplanningHelper = new FloorPlannerHelper(this.model.floorplan, this.floorplanner);
        }

        this.view_now = 3;
        this.switchView();
    }

    switchView() {
        if (this.options.widget) {
            return;
        }
        this.floorplanner.switchMode(floorplannerModes.MOVE);
        if (this.view_now === 3 && !this.options.widget) {
            this.view_now = 2;
            document.getElementById(this.options.viewer2d.id).style.visibility = "visible";
            document.getElementById(this.options.viewer3d.id).style.visibility = "hidden";
            this.roomplanner.enabled = false;
        } else if (this.view_now === 2 && !this.options.widget) {
            this.view_now = 3;
            document.getElementById(this.options.viewer2d.id).style.visibility = "hidden";
            document.getElementById(this.options.viewer3d.id).style.visibility = "visible";
            this.roomplanner.enabled = true;
        }
    }

    setViewer2DModeToDraw(mode) {
        if (this.options.widget) {
            return;
        }
        this.floorplanner.switchMode(floorplannerModes.DRAW);
    }

    setViewer2DModeToMove(mode) {
        if (this.options.widget) {
            return;
        }
        this.floorplanner.switchMode(floorplannerModes.MOVE);
    }

    switchViewer2DToTransform(mode) {
        if (this.options.widget) {
            return;
        }
        this.floorplanner.switchMode(floorplannerModes.EDIT_ISLANDS);
    }

    updateView3D() {
        this.viewer3d.needsUpdate = true;
    }

    get currentView() {
        return this.view_now;
    }
}
export { BlueprintJS };