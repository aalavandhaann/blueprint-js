import QuickSettings from 'quicksettings';

export class ParametricsInterface {
    constructor(parametricDataClass, viewer3D, x = 0, y = 0, appParent = null) {
        this.__parametricDataClass = parametricDataClass;
        this.__viewer3D = viewer3D;
        this.__settings = QuickSettings.create(x, y, `Parametric Item: ${parametricDataClass.name}`, appParent);
        this.__constructUI();
    }

    __constructUI() {
        let parameters = this.__parametricDataClass.parameters;
        let parametricsClass = this.__parametricDataClass;
        let viewer3D = this.__viewer3D;
        for (let opt in parameters) {
            let property = parameters[opt];
            switch (property.type) {
                case 'color':
                    this.__settings.addColor(opt, parametricsClass[opt], function(value) {
                        parametricsClass[opt] = value;
                        viewer3D.needsUpdate = true;
                    });
                    break;
                case 'number':
                    this.__settings.addNumber(opt, 10, 5000, parametricsClass[opt], 1, function(value) {
                        parametricsClass[opt] = value;
                        viewer3D.needsUpdate = true;
                    });
                    break;
                case 'range':
                    this.__settings.addRange(opt, property.min, property.max, parametricsClass[opt], property.step, function(value) {
                        parametricsClass[opt] = value;
                        viewer3D.needsUpdate = true;
                    });
                    break;
                case 'choice':
                    this.__settings.addDropDown(opt, property.value, function(item) {
                        parametricsClass[opt] = item.value;
                        viewer3D.needsUpdate = true;
                    });
                    break;
                default:
                    console.log('YET TO IMPLEMENT');
            }
        }
    }

    destroy() {
        if (this.__settings) {
            this.__settings.destroy();
        }
    }
}