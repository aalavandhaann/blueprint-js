import Enum from 'es6-enum';
export const GUI_TYPES = Enum('Boolean', 'Function', 'Color', 'Date', 'Array', 'HtmlElement', 'File', 'Html', 'Image', 'Number', 'String', 'Time');

export class GuiBindable extends EventDispatcher
{
	constructor(instance, property, guiObject)
	{
		
	}
	
	
	
	updateGUI()
	{
		
	}
}
