/*
 * Camera Buttons
 */

var CameraButtons = function(blueprint3d) 
{
  var orbitControls = blueprint3d.three.controls;
  var three = blueprint3d.three;

  var panSpeed = 30;
  var directions = {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4
  }
  
  function centerView()
  {
	  (function printGraph( obj ) {
		    
		    console.group( ' <%o> ' + obj.name, obj );
		 
		    obj.children.forEach( printGraph );
		    
		    console.groupEnd();

		} ( three.scene.getScene()) );
	  three.centerCamera();
  }

  function init() {
    // Camera controls
    $("#zoom-in").click(zoomIn);
    $("#zoom-out").click(zoomOut);  
    $("#zoom-in").dblclick(preventDefault);
    $("#zoom-out").dblclick(preventDefault);

    $("#reset-view").click(()=>{centerView();});

    $("#move-left").click(function(){
      pan(directions.LEFT)
    })
    $("#move-right").click(function(){
      pan(directions.RIGHT)
    })
    $("#move-up").click(function(){
      pan(directions.UP)
    })
    $("#move-down").click(function(){
      pan(directions.DOWN)
    })

    $("#move-left").dblclick(preventDefault);
    $("#move-right").dblclick(preventDefault);
    $("#move-up").dblclick(preventDefault);
    $("#move-down").dblclick(preventDefault);
  }

  function preventDefault(e) 
  {
    e.preventDefault();
    e.stopPropagation();
  }

  function pan(direction) 
  {
    switch (direction) {
      case directions.UP:
        orbitControls.panXY(0, panSpeed);
        break;
      case directions.DOWN:
        orbitControls.panXY(0, -panSpeed);
        break;
      case directions.LEFT:
        orbitControls.panXY(panSpeed, 0);
        break;
      case directions.RIGHT:
        orbitControls.panXY(-panSpeed, 0);
        break;
    }
  }

  function zoomIn(e) {
    e.preventDefault();
    orbitControls.dollyIn(1.1);
    orbitControls.update();
  }

  function zoomOut(e) {
    e.preventDefault;
    orbitControls.dollyOut(1.1);
    orbitControls.update();
  }

  init();
}

/*
 * Context menu for selected item
 */ 

var ContextMenu = function(blueprint3d) {

  var scope = this;
  var selectedItem;
  var three = blueprint3d.three;

  function init() {
    $("#context-menu-delete").click(function(event) {
        selectedItem.remove();
    });
    
    
//    three.itemSelectedCallbacks.add(itemSelected);
//    three.itemUnselectedCallbacks.add(itemUnselected);
//    
    three.addEventListener(BP3DJS.EVENT_ITEM_SELECTED, function(o){itemSelected(o.item);});
    three.addEventListener(BP3DJS.EVENT_ITEM_UNSELECTED, function(o){itemUnselected();});
    
    initResize();

    $("#fixed").click(function() {
        var checked = $(this).prop('checked');
        selectedItem.setFixed(checked);
        three.itemIsSelected(selectedItem);
    });
  }

  function cmToIn(cm) {
    return cm / 2.54;
  }

  function inToCm(inches) {
    return inches * 2.54;
  }

  function itemSelected(item) {
    selectedItem = item;

    $("#context-menu-name").text(item.metadata.itemName);

    $("#item-width").val(cmToIn(selectedItem.getWidth()).toFixed(0));
    $("#item-height").val(cmToIn(selectedItem.getHeight()).toFixed(0));
    $("#item-depth").val(cmToIn(selectedItem.getDepth()).toFixed(0));

    $("#context-menu").show();

    $("#fixed").prop('checked', item.fixed);
  }

  function resize() {
    selectedItem.resize(
      inToCm($("#item-height").val()),
      inToCm($("#item-width").val()),
      inToCm($("#item-depth").val())
    );
  }

  function initResize() {
    $("#item-height").change(resize);
    $("#item-width").change(resize);
    $("#item-depth").change(resize);
  }

  function itemUnselected() {
    selectedItem = null;
    $("#context-menu").hide();
  }

  init();
}

/*
 * Loading modal for items
 */

var ModalEffects = function(blueprint3d) {

  var scope = this;
  var blueprint3d = blueprint3d;
  var itemsLoading = 0;

  this.setActiveItem = function(active) {
    itemSelected = active;
    update();
  }

  function update() {
    if (itemsLoading > 0) {
      $("#loading-modal").show();
    } else {
      $("#loading-modal").hide();
    }
  }

  function init() 
  {
	
//    blueprint3d.model.scene.itemLoadingCallbacks.add(function() {
   blueprint3d.model.scene.addEventListener(BP3DJS.EVENT_ITEM_LOADING, function() {
      itemsLoading += 1;
      update();
    });

//   blueprint3d.model.scene.itemLoadedCallbacks.add(function() {
	   blueprint3d.model.scene.addEventListener(BP3DJS.EVENT_ITEM_LOADED, function() {
      itemsLoading -= 1;
      update();
    });   

    update();
  }

  init();
}

/*
 * Side menu
 */

var SideMenu = function(blueprint3d, floorplanControls, modalEffects) {
  var blueprint3d = blueprint3d;
  var floorplanControls = floorplanControls;
  var modalEffects = modalEffects;

  var ACTIVE_CLASS = "active";

  var tabs = {
    "FLOORPLAN" : $("#floorplan_tab"),
    "SHOP" : $("#items_tab"),
    "DESIGN" : $("#design_tab")
  }

  var scope = this;
  this.stateChangeCallbacks = $.Callbacks();

  this.states = {
    "DEFAULT" : {
      "div" : $("#viewer"),
      "tab" : tabs.DESIGN
    },
    "FLOORPLAN" : {
      "div" : $("#floorplanner"),
      "tab" : tabs.FLOORPLAN
    },
    "SHOP" : {
      "div" : $("#add-items"),
      "tab" : tabs.SHOP
    }
  }

  // sidebar state
  var currentState = scope.states.FLOORPLAN;

  function init() {
    for (var tab in tabs) {
      var elem = tabs[tab];
      elem.click(tabClicked(elem));
    }

    $("#update-floorplan").click(floorplanUpdate);

    initLeftMenu();

    blueprint3d.three.updateWindowSize();
    handleWindowResize();

    initItems();

    setCurrentState(scope.states.DEFAULT);
  }

  function floorplanUpdate() {
    setCurrentState(scope.states.DEFAULT);
  }

  function tabClicked(tab) {
    return function() {
      // Stop three from spinning
      blueprint3d.three.stopSpin();

      // Selected a new tab
      for (var key in scope.states) {
        var state = scope.states[key];
        if (state.tab == tab) {
          setCurrentState(state);
          break;
        }
      }
    }
  }
  
  function setCurrentState(newState) {

    if (currentState == newState) {
      return;
    }

    // show the right tab as active
    if (currentState.tab !== newState.tab) {
      if (currentState.tab != null) {
        currentState.tab.removeClass(ACTIVE_CLASS);          
      }
      if (newState.tab != null) {
        newState.tab.addClass(ACTIVE_CLASS);
      }
    }

    // set item unselected
    blueprint3d.three.getController().setSelectedObject(null);

    // show and hide the right divs
    currentState.div.hide()
    newState.div.show()

    // custom actions
    if (newState == scope.states.FLOORPLAN) {
      floorplanControls.updateFloorplanView();
      floorplanControls.handleWindowResize();
    } 

    if (currentState == scope.states.FLOORPLAN) {
      blueprint3d.model.floorplan.update();
    }

    if (newState == scope.states.DEFAULT) {
      blueprint3d.three.updateWindowSize();
    }
 
    // set new state
    handleWindowResize();    
    currentState = newState;

    scope.stateChangeCallbacks.fire(newState);
  }

  function initLeftMenu() {
    $( window ).resize( handleWindowResize );
    handleWindowResize();
  }

  function handleWindowResize() {
    $(".sidebar").height(window.innerHeight);
    $("#add-items").height(window.innerHeight);

  };

  // TODO: this doesn't really belong here
  function initItems() {
    $("#add-items").find(".add-item").mousedown(function(e) {
      var modelUrl = $(this).attr("model-url");
      var itemType = parseInt($(this).attr("model-type"));
      var metadata = {
        itemName: $(this).attr("model-name"),
        resizable: true,
        modelUrl: modelUrl,
        itemType: itemType
      }
      console.log(itemType, modelUrl, metadata);
      blueprint3d.model.scene.addItem(itemType, modelUrl, metadata);
      setCurrentState(scope.states.DEFAULT);
    });
  }

  init();

}

/*
 * Change floor and wall textures
 */

var TextureSelector = function (blueprint3d, sideMenu) {

  var scope = this;
  var three = blueprint3d.three;
  var isAdmin = isAdmin;

  var currentTarget = null;

  function initTextureSelectors() 
  {
	 $('#environments :checkbox').change(function()
	 {
		 console.log(this.checked)
		 three.skybox.toggleEnvironment(this.checked);
	 });
    $(".texture-select-thumbnail").click(function(e) 
    {
      var textureUrl = $(this).attr("texture-url");
      var textureStretch = ($(this).attr("texture-stretch") == "true");
      var textureScale = parseInt($(this).attr("texture-scale"));
      var isEnvTexture = (textureUrl.indexOf('envs') > -1);
      
      if(!isEnvTexture)
      {
    	  currentTarget.setTexture(textureUrl, textureStretch, textureScale);
      }
      else
	  {
    	  three.skybox.setEnvironmentMap(textureUrl);
	  }
      
      e.preventDefault();
    });
  }

  function init() {
    // three.wallClicked.add(wallClicked);
    // three.floorClicked.add(floorClicked);
    // three.itemSelectedCallbacks.add(reset);
    // three.nothingClicked.add(reset);

    three.addEventListener(BP3DJS.EVENT_WALL_CLICKED, (o)=>{wallClicked(o.item);});
    three.addEventListener(BP3DJS.EVENT_FLOOR_CLICKED, (o)=>{floorClicked(o.item);});
    three.addEventListener(BP3DJS.EVENT_NOTHING_CLICKED, ()=>{reset();});
    three.addEventListener(BP3DJS.EVENT_ITEM_SELECTED, (o)=>{reset();});    
    sideMenu.stateChangeCallbacks.add(reset);
    initTextureSelectors();
  }

  function wallClicked(halfEdge) {
    currentTarget = halfEdge;
    $("#floorTexturesDiv").hide();  
    $("#wallTextures").show();  
  }

  function floorClicked(room) {
    currentTarget = room;
    $("#wallTextures").hide();  
    $("#floorTexturesDiv").show();  
  }

  function reset() {
    $("#wallTextures").hide();  
    $("#floorTexturesDiv").hide();  
  }

  init();
}

/*
 * Floorplanner controls
 */

var ViewerFloorplanner = function(blueprint3d) {

  var canvasWrapper = '#floorplanner';

  // buttons
  var move = '#move';
  var remove = '#delete';
  var draw = '#draw';

  var activeStlye = 'btn-primary disabled';

  this.floorplanner = blueprint3d.floorplanner;

  var scope = this;

  function init() {

    $( window ).resize( scope.handleWindowResize );
    scope.handleWindowResize();

    // mode buttons
//    scope.floorplanner.modeResetCallbacks.add(function(mode) {
    scope.floorplanner.addEventListener(BP3DJS.EVENT_MODE_RESET, function(mode) {
      $(draw).removeClass(activeStlye);
      $(remove).removeClass(activeStlye);
      $(move).removeClass(activeStlye);
      if (mode == BP3DJS.floorplannerModes.MOVE) {
          $(move).addClass(activeStlye);
      } else if (mode == BP3DJS.floorplannerModes.DRAW) {
          $(draw).addClass(activeStlye);
      } else if (mode == BP3DJS.floorplannerModes.DELETE) {
          $(remove).addClass(activeStlye);
      }

      if (mode == BP3DJS.floorplannerModes.DRAW) {
        $("#draw-walls-hint").show();
        scope.handleWindowResize();
      } else {
        $("#draw-walls-hint").hide();
      }
    });

    $(move).click(function(){
      scope.floorplanner.setMode(BP3DJS.floorplannerModes.MOVE);
    });

    $(draw).click(function(){
      scope.floorplanner.setMode(BP3DJS.floorplannerModes.DRAW);
    });

    $(remove).click(function(){
      scope.floorplanner.setMode(BP3DJS.floorplannerModes.DELETE);
    });
  }

  this.updateFloorplanView = function() {
    scope.floorplanner.reset();
  }

  this.handleWindowResize = function() {
    $(canvasWrapper).height(window.innerHeight - $(canvasWrapper).offset().top);
    scope.floorplanner.resizeView();
  };

  init();
};

var mainControls = function(blueprint3d) {
  var blueprint3d = blueprint3d;

  function newDesign() {
    blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
  }

  function loadDesign() 
  {
    files = $("#loadFile").get(0).files;
    var reader  = new FileReader();
    reader.onload = function(event) {
        var data = event.target.result;
        blueprint3d.model.loadSerialized(data);
    }
    reader.readAsText(files[0]);
  }

  function saveDesign() {
    var data = blueprint3d.model.exportSerialized();
    var a = window.document.createElement('a');
    var blob = new Blob([data], {type : 'text'});
    a.href = window.URL.createObjectURL(blob);
    a.download = 'design.blueprint3d';
    document.body.appendChild(a)
    a.click();
    document.body.removeChild(a)
  }

  function init() {
    $("#new").click(newDesign);
    $("#loadFile").change(loadDesign);
    $("#saveFile").click(saveDesign);
  }

  init();
}

/*
 * Initialize!
 */

$(document).ready(function() {

  // main setup
  var opts = 
  {
    floorplannerElement: 'floorplanner-canvas',
    threeElement: '#viewer',
    threeCanvasElement: 'three-canvas',
    textureDir: "models/textures/",
    widget: false
  }
  var blueprint3d = new BP3DJS.BlueprintJS(opts);

  var modalEffects = new ModalEffects(blueprint3d);
  var viewerFloorplanner = new ViewerFloorplanner(blueprint3d);
  var contextMenu = new ContextMenu(blueprint3d);
  var sideMenu = new SideMenu(blueprint3d, viewerFloorplanner, modalEffects);
  var textureSelector = new TextureSelector(blueprint3d, sideMenu);        
  var cameraButtons = new CameraButtons(blueprint3d);
  mainControls(blueprint3d);
  
  var myhome = '{"floorplan":{"corners":{"16b020d0-fa1e-f198-bbc6-2ad1a59268d0":{"x":135.31850000000009,"y":-887.476},"8d92c038-8852-f4ea-e8bb-ac03f938f703":{"x":-44.06899999999996,"y":359.15600000000006},"5eee22b8-d773-5b93-c4c8-bf4286ac436d":{"x":-220.09100000000012,"y":-887.476},"4cd3d434-0921-ccfa-0e29-29d3778be8be":{"x":-220.09100000000012,"y":-105.15599999999995},"79dd4e37-0bc6-c662-2197-ec97c356a7d4":{"x":135.31850000000009,"y":-265.6840000000001},"e8c4dc18-0a85-92a9-85b2-37dee45f4a00":{"x":-220.09100000000012,"y":-403.85999999999984},"ea1bedfe-ca15-1744-4108-5450cc842661":{"x":-66.42100000000008,"y":-403.85999999999984},"b1c87f68-9c9e-99d2-859c-fb793355d90b":{"x":-66.42100000000008,"y":-265.6840000000001},"c8a304a1-b9bd-6b76-92e9-2321af0bd415":{"x":-44.06899999999996,"y":-105.15599999999995},"263a453c-9952-75d6-8810-8477a3265bc6":{"x":188.1505000000002,"y":-105.15599999999995},"483d787d-0016-0751-aeda-087bab3a0ed6":{"x":188.1505000000002,"y":-188.4679999999999},"e3e27b42-3226-3fe2-5153-1bbb7a498584":{"x":326.3265000000001,"y":-188.4679999999999},"22ad9451-b853-12b7-f471-9299192489e4":{"x":326.3265000000001,"y":-381.5079999999999},"3eb61572-0237-0254-1e1a-8526c2a71ec6":{"x":452.31050000000005,"y":-381.5079999999999},"1b0e7027-3dc4-12cb-0937-370a669217a5":{"x":604.52,"y":-887.476},"d326e87e-4117-7033-7844-e7486d249b1e":{"x":604.52,"y":-381.5079999999999},"4f68435b-ee33-c4cb-2b60-69945652cacd":{"x":326.3265000000001,"y":-499.36400000000003},"f0569ab9-d17a-cb83-cd6d-1ccff1b4025a":{"x":135.31850000000009,"y":-499.36400000000003},"56aa05eb-95de-2e11-d759-38814b8d9ce0":{"x":452.31050000000005,"y":-499.36400000000003},"a4c70aaa-7fcb-5c76-0308-50c45bbe10a0":{"x":604.52,"y":-499.36400000000003},"007d1f79-7d8f-827e-60ce-b3efb21444eb":{"x":604.52,"y":-105.15599999999995},"b8dc05af-4819-456f-63e1-6a975118bbb4":{"x":604.52,"y":359.15600000000006},"bf238f73-f50e-a2c6-d877-0c39e7c2c330":{"x":326.3265000000001,"y":-105.15599999999995}},"walls":[{"corner1":"4cd3d434-0921-ccfa-0e29-29d3778be8be","corner2":"c8a304a1-b9bd-6b76-92e9-2321af0bd415","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"5eee22b8-d773-5b93-c4c8-bf4286ac436d","corner2":"16b020d0-fa1e-f198-bbc6-2ad1a59268d0","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"16b020d0-fa1e-f198-bbc6-2ad1a59268d0","corner2":"1b0e7027-3dc4-12cb-0937-370a669217a5","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"16b020d0-fa1e-f198-bbc6-2ad1a59268d0","corner2":"f0569ab9-d17a-cb83-cd6d-1ccff1b4025a","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"8d92c038-8852-f4ea-e8bb-ac03f938f703","corner2":"c8a304a1-b9bd-6b76-92e9-2321af0bd415","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"8d92c038-8852-f4ea-e8bb-ac03f938f703","corner2":"b8dc05af-4819-456f-63e1-6a975118bbb4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4cd3d434-0921-ccfa-0e29-29d3778be8be","corner2":"e8c4dc18-0a85-92a9-85b2-37dee45f4a00","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"e8c4dc18-0a85-92a9-85b2-37dee45f4a00","corner2":"5eee22b8-d773-5b93-c4c8-bf4286ac436d","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"e8c4dc18-0a85-92a9-85b2-37dee45f4a00","corner2":"ea1bedfe-ca15-1744-4108-5450cc842661","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"ea1bedfe-ca15-1744-4108-5450cc842661","corner2":"b1c87f68-9c9e-99d2-859c-fb793355d90b","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"b1c87f68-9c9e-99d2-859c-fb793355d90b","corner2":"79dd4e37-0bc6-c662-2197-ec97c356a7d4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"c8a304a1-b9bd-6b76-92e9-2321af0bd415","corner2":"263a453c-9952-75d6-8810-8477a3265bc6","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"263a453c-9952-75d6-8810-8477a3265bc6","corner2":"bf238f73-f50e-a2c6-d877-0c39e7c2c330","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"263a453c-9952-75d6-8810-8477a3265bc6","corner2":"483d787d-0016-0751-aeda-087bab3a0ed6","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"483d787d-0016-0751-aeda-087bab3a0ed6","corner2":"e3e27b42-3226-3fe2-5153-1bbb7a498584","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"e3e27b42-3226-3fe2-5153-1bbb7a498584","corner2":"bf238f73-f50e-a2c6-d877-0c39e7c2c330","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"007d1f79-7d8f-827e-60ce-b3efb21444eb","corner2":"d326e87e-4117-7033-7844-e7486d249b1e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"d326e87e-4117-7033-7844-e7486d249b1e","corner2":"3eb61572-0237-0254-1e1a-8526c2a71ec6","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"22ad9451-b853-12b7-f471-9299192489e4","corner2":"e3e27b42-3226-3fe2-5153-1bbb7a498584","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4f68435b-ee33-c4cb-2b60-69945652cacd","corner2":"22ad9451-b853-12b7-f471-9299192489e4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4f68435b-ee33-c4cb-2b60-69945652cacd","corner2":"56aa05eb-95de-2e11-d759-38814b8d9ce0","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"56aa05eb-95de-2e11-d759-38814b8d9ce0","corner2":"3eb61572-0237-0254-1e1a-8526c2a71ec6","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"3eb61572-0237-0254-1e1a-8526c2a71ec6","corner2":"22ad9451-b853-12b7-f471-9299192489e4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"1b0e7027-3dc4-12cb-0937-370a669217a5","corner2":"a4c70aaa-7fcb-5c76-0308-50c45bbe10a0","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4f68435b-ee33-c4cb-2b60-69945652cacd","corner2":"f0569ab9-d17a-cb83-cd6d-1ccff1b4025a","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f0569ab9-d17a-cb83-cd6d-1ccff1b4025a","corner2":"79dd4e37-0bc6-c662-2197-ec97c356a7d4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"56aa05eb-95de-2e11-d759-38814b8d9ce0","corner2":"a4c70aaa-7fcb-5c76-0308-50c45bbe10a0","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"a4c70aaa-7fcb-5c76-0308-50c45bbe10a0","corner2":"d326e87e-4117-7033-7844-e7486d249b1e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"bf238f73-f50e-a2c6-d877-0c39e7c2c330","corner2":"007d1f79-7d8f-827e-60ce-b3efb21444eb","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"007d1f79-7d8f-827e-60ce-b3efb21444eb","corner2":"b8dc05af-4819-456f-63e1-6a975118bbb4","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[{"item_name":"Open Door","item_type":7,"model_url":"models/js/open_door.js","xpos":45.60973158833667,"ypos":110.5,"zpos":-265.1840000000001,"rotation":0,"scale_x":1.1771369721936153,"scale_y":0.997292171703541,"scale_z":0.9994150405405762,"fixed":true},{"item_name":"Open Door","item_type":7,"model_url":"models/js/open_door.js","xpos":226.19923363943076,"ypos":110.800000297771,"zpos":-499.86400000000003,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Open Door","item_type":7,"model_url":"models/js/open_door.js","xpos":71.15100000000002,"ypos":110.5,"zpos":-104.65599999999995,"rotation":0,"scale_x":1.5695159629248197,"scale_y":0.997292171703541,"scale_z":0.9994150405405762,"fixed":true},{"item_name":"NYC Poster","item_type":2,"model_url":"models/js/nyc-poster2.js","xpos":598.25,"ypos":183.62661902009813,"zpos":117.68045683694481,"rotation":-1.5707963267948966,"scale_x":0.7142842857142857,"scale_y":0.8421024709178014,"scale_z":1.0129608601270457,"fixed":true},{"item_name":"Dresser - Dark Wood","item_type":1,"model_url":"models/js/DWR_MATERA_DRESSER2.js","xpos":549.2058844807959,"ypos":57.785001860754996,"zpos":329.7799662755366,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Coffee Table - Wood","item_type":1,"model_url":"models/js/ik-stockholmcoffee-brown.js","xpos":272.6962787349586,"ypos":24.01483158034958,"zpos":126.73694950426048,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Window","item_type":3,"model_url":"models/js/whitewindow.js","xpos":512.6434934035085,"ypos":157.07894848817114,"zpos":-886.976,"rotation":0,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Window","item_type":3,"model_url":"models/js/whitewindow.js","xpos":-120.92122752323827,"ypos":168.10483780571963,"zpos":-886.976,"rotation":0,"scale_x":0.6603999999996408,"scale_y":0.5810892360052958,"scale_z":1.0332383005354289,"fixed":true},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":-103.81899999999992,"ypos":110.80000022010701,"zpos":-105.65599999999995,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":325.8265000000001,"ypos":110.5,"zpos":-280.9525143309595,"rotation":-1.5707963267948966,"scale_x":1.2294541709577755,"scale_y":0.9972921724026447,"scale_z":0.9482825135211149,"fixed":true},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":325.8265000000001,"ypos":110.80000022010701,"zpos":-439.4767618863214,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":250.42795654332926,"ypos":110.80000022010701,"zpos":-188.9679999999999,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":527.7045416935933,"ypos":110.80000022010701,"zpos":-499.86400000000003,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Closed Door","item_type":7,"model_url":"models/js/closed-door28x80_baked.js","xpos":17.379725040490854,"ypos":110.5,"zpos":-886.976,"rotation":0,"scale_x":1.1771369721936145,"scale_y":0.9972921724026447,"scale_z":0.948282513521117,"fixed":true},{"item_name":"Media Console - White","item_type":9,"model_url":"models/js/cb-clapboard_baked.js","xpos":574.12,"ypos":67.89999754396,"zpos":131.42070309211852,"rotation":-1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Sofa - Grey","item_type":1,"model_url":"models/js/cb-rochelle-gray_baked.js","xpos":12.257267191489404,"ypos":42.54509923821,"zpos":136.8119273061203,"rotation":1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Blue Rug","item_type":8,"model_url":"models/js/cb-blue-block-60x96.js","xpos":184.68588061910788,"ypos":0.250005,"zpos":122.38666413809182,"rotation":1.5707963267948966,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Window","item_type":3,"model_url":"models/js/whitewindow.js","xpos":438.5412557798525,"ypos":159.40045156749102,"zpos":358.65600000000006,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Window","item_type":3,"model_url":"models/js/whitewindow.js","xpos":307.85036934553574,"ypos":159.1968280144008,"zpos":358.6560000000001,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true},{"item_name":"Window","item_type":3,"model_url":"models/js/whitewindow.js","xpos":182.15084546678992,"ypos":159.0605552363389,"zpos":358.6560000000001,"rotation":3.141592653589793,"scale_x":1,"scale_y":1,"scale_z":1,"fixed":true}]}';
  // This serialization format needs work
  // Load a simple rectangle room
//  blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
  blueprint3d.model.loadSerialized(myhome);
});
