var modelTypesNum = ["0", "1", "2", "3", "4", "7", "8", "9"];
var modelTypesIds = ["item-items", "floor-items", "wall-items", "in-wall-items", "roof-items", "in-wall-floor-items", "on-floor-items", "wall-floor-items"];
var itemsDiv = $("#items-wrapper");
for (var i = 0; i < items.length; i++) 
{
	var item = items[i];
	itemsDiv = $("#"+modelTypesIds[modelTypesNum.indexOf(item.type)]+"-wrapper");
	var modelformat = (item.format) ?' model-format="'+item.format+'"' : "";
	var html = '<div class="col-sm-4">' + '<a class="thumbnail add-item"' +' model-name="'+ item.name +'"' +' model-url="' +item.model+'"' +' model-type="' +item.type+'"' + modelformat+'>'+'<img src="'+item.image +'" alt="Add Item"   data-dismiss="modal" 	> '+item.name +'</a></div>';
	itemsDiv.append(html);
}
