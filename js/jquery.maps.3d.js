/*
 * JQuery maps plugin 0.3
 *  Copyright (c) 2009
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
*/

 (function($) {
	$.maps = {
		defaults: {
			data_file : 'data.json',
			title : 'KESM test data',
			levels : 4,
			level : 1,
			image_dir : '1/',
			image_name: '%Z-%X-%Y.png',
			zoom: 1,
			zoom_levels: 5,
			initx: 0,
			inity: 0,
			dataset_id: -1,
			infoDisplay: '<h2>Add Annotation</h2><form id = "addAnnotation" action = "#" method = "post"><label for = "name">Name:</label> <input id = "name" name = "name" ><br /><label for = "description">Description:</label> <textarea id = "description" name = "description" ></textarea><input id = "submit" name = "submit" type = "submit" value = "Send"/ ></form>',
			infoImage: '<img src = "/maps/img/infowindow-bottom.png" />',
			exitLink: '<a href = "#" title = "Close Window" id = "exitLink">x</a>',
			resolutions: [{"width":512,"height":512},{"width":1024,"height":1024},{"width":2048,"height":2048},{"width":4096,"height":4096}],
			columns: [4096],
			colors: [
							{"name":"Black", "attr": {"r":0,"g":0,"b":0}},
							{"name":"Blue", "attr": {"r":0,"g":0,"b":255}},
							{"name":"Brown", "attr": {"r":152,"g":66,"b":34}},
							{"name":"Maroon", "attr": {"r":128,"g":0,"b":0}},
							{"name":"Cyan", "attr": {"r":0,"g":255,"b":255}},
							{"name":"Green", "attr": {"r":0,"g":255,"b":0}},
							{"name":"Magenta", "attr": {"r":255,"g":0,"b":255}},
							{"name":"Orange", "attr": {"r":255,"g":128,"b":0}},
							{"name":"Purple", "attr": {"r":128,"g":0,"b":128}},
							{"name":"Red", "attr": {"r":255,"g":0,"b":0}},
							{"name":"Yellow", "attr": {"r":255,"g":255,"b":0}},
							{"name":"White", "attr": {"r":255,"g":255,"b":255}}
						]
		}
	};
		
	$.fn.extend({
		createMap: function(settings) {
			$['mapsettings'] = $.extend({}, $.maps.defaults , settings);
			
			$['mapsettings'].loaded = []; 								// Hash of currently loaded images
			
			$['mapsettings'].markers = [];								// Markers list
			
			$['mapsettings'].markerLocations = [];				// Cache of marker positions at each
																										// zoom level to prevent loss of precision. 
																										// Currently redundent so todo: remove.
																										
			$['mapsettings'].infoWindowLocation = [];			// Location of info windows position,
																										
			$['mapsettings'].hasOpenInfoWindow = false;
			$['mapsettings'].afterModal = new Array;			// Array of functions to perform after
																										// modal boxes (that drop down from top)
																										// is completed. Can be changed to alternative
																										// where next function is passed at time of calling.
			var sets = $['mapsettings'];
		  var $this = $(this);
			$['mapsettings'].element = $this;
			
			resizeDiv();
			
			$this.append('<div id = "controls"></div>');
			$("<a />").attr('href', '#').click(function(e) { 
				e.preventDefault(); 
				if(sets.zoom_levels != sets.zoom) { 
					zoomTo(sets.zoom+1); 
				} }).append('+').attr('id', 'zoom_in').appendTo("#controls");
			$("<a />").attr('href', '#').click(function(e) {
				e.preventDefault(); 
				if(sets.zoom_levels > 1) { 
					zoomTo(sets.zoom-1); 
				} }).append('-').attr('id', 'zoom_out').appendTo("#controls");
			
			buildZoomSlider();
			
			$this.append('<div id = "inner"></div>');
			$("#inner").attr('style', 'left:0px; top:0px;').append('<div id="tiles"></div>');
			$("#tiles").append('<div id = "images"></div>');
		 	$("#tiles").append('<ul id = "markers"></ul>');
			$('#tiles').append('<div id = "infowindows"></div>');
			
			getInnerDimentions();
			
			loadImages();
			
			centerMap();
															
			var move = function(e) {
				$['mapsettings'].moved = true;
				var inner = $("#inner");
				var initx = $['mapsettings'].initx
				var inity = $['mapsettings'].inity;
				var top = $['mapsettings'].initTop;
				var left = $['mapsettings'].initLeft;
				var x = e.pageX - this.offsetLeft; // Get mouse x location
				var y = e.pageY - this.offsetTop; // Get mouse y location
				var pos = "left: " + (x-initx+left) + "px; top: " + (y-inity+top) + "px;";
				$("#inner").attr('style', pos);
				loadImages();
				$['mapsettings'].element.trigger('mapMoved');
			}
			$['mapsettings'].move = move;
			$['mapsettings'].mouseup = function(e){
						$("#tiles").unbind('mousemove',move);
						$("#tiles").css('cursor', 'move');
						$("#tiles").css('cursor', '-webkit-grab');
						$("#tiles").css('cursor', '-moz-grab');
						getInnerDimentions();
						loadImages();
			    };
			$['mapsettings'].mousedown = function(e){
								e.preventDefault();

								document.body.focus();

				        // prevent text selection in IE
				        document.onselectstart = function () { return false; };
				        // prevent IE from trying to drag an image
								if(e.srcElement)
				        	e.srcElement.ondragstart = function() { return false; };


								getInnerDimentions();
								$['mapsettings'].moved = false;
								$['mapsettings'].initx=e.pageX - this.offsetLeft;
								$['mapsettings'].inity=e.pageY - this.offsetTop;
								$("#tiles").mousemove(move);
								$("#tiles").css('cursor', '-webkit-grabbing');
								$("#tiles").css('cursor', '-moz-grabbing');
					    };
					
			$("#tiles").mouseup($['mapsettings'].mouseup).mousedown($['mapsettings'].mousedown);
	     $(window).resize(function(e) {
	          resizeDiv();
	       });
		},
		addAnnotations: function(save_url) { 			
			if(save_url) 
				$['mapsettings'].save_url = save_url;
			else 
				$['mapsettings'].save_url = '/annotations/add';
			addCanvas(); addAnnotationControls(); 
		},
		addLevels: function() {
			var sets = $['mapsettings'];
			sets.element.append('<div id = "levels"><a href = "#" id = "showLevels">Show Level Selector</a><h2>Choose level:</h2><ul></ul></div>');
			// Adds the levels element
			for(var i=1;i<=sets.levels;i++){
				var theClass = '';
				if(sets.level == i)
					theClass = ' class = "selected" ';
				$('#levels ul').append('<li'+theClass+'><a href = "#" id = "changeLevel'+i+'">Level ' + i + '<br /><img src = "'+sets.image_dir+i+'/thumb_small.jpg" alt = "level'+i+'" /></a></li>');
			}
			
			$('#levels').scrollTop(0); // Is to ensure that the level selector is scolled to top on start.
			
			var updown = function(e){
				e.preventDefault();
				if(e.which == 40) { // if key pressed was down
					setLevelTo($['mapsettings'].level+1);
				} else if(e.which == 38) { // if key pressed was up
					setLevelTo($['mapsettings'].level-1);
				}
			} 
			
			$("#showLevels").toggle(function(e){
				e.preventDefault();
				$("#levels").css('overflow','auto').css('top','0').css('height','auto');
				$(this).html('Hide Level Selector');
				$(document).keyup(updown);
			}, function(e) {
				e.preventDefault();
				$('#levels').scrollTop(0);
				$("#levels").css('overflow','hidden').css('top','auto').css('height','20px');
				$(this).html('Show Level Selector');
				$(document).unbind('keyup',updown);
			});
			
			$("#levels li a").click(function(e){
				e.preventDefault();
				setLevelTo($(this).attr('id').replace('changeLevel', ''));				
			});
		}
	});
	
	
	// Sets the zoom level
	function zoomTo(zoomLevel) {
		var offset = getZoomOffset(zoomLevel); 
		repositionMarkers(zoomLevel);
		repositionInfoWindow(zoomLevel);
		sets.zoom = zoomLevel;
		moveMap(offset); 
		loadImages();
		updateZoomSlider();
	}
	
	// Sets the level of the map
	function setLevelTo(level) {
		if($['mapsettings'].level==$['mapsettings'].levels) return false;
		$('#levels li.selected').removeClass('selected');
		$['mapsettings'].level = level;
		$($('#changeLevel' + $['mapsettings'].level).parents().get(0)).addClass('selected');
		$['mapsettings'].loaded = new Array(); // Reset loaded array so that images aren't cached.
		loadImages();
		$['mapsettings'].annotations.draw();
	}
	
	// Adds the canvas element and sets up events
	function addCanvas() {
		var canvas = document.createElement('canvas');
		canvas.id = 'canvas';
		
		// For use with EXCanvas with internet explorer
		if(typeof(G_vmlCanvasManager) != 'undefined') {
			canvas = G_vmlCanvasManager.initElement(canvas);
		}
		
		$['mapsettings'].ctx = canvas.getContext("2d");

		$('#tiles').append(canvas);
		
		$['mapsettings'].scale = new Point(1,1); 
		scaleCanvas();
		$['mapsettings'].translatex = 0;
		$['mapsettings'].translatey = 0;
		
		$['mapsettings'].ctx.save();
		
		$['mapsettings'].annotations = new Annotations($['mapsettings'].ctx);
		$['mapsettings'].selectedAnnotation = -1;
		
		// The following code positions the canvas ontop of the current viewport
		// TODO: replace this code when annotations are each presented in their own canvas element
		var left = parseInt($('#inner').css('left'));
		var top = parseInt($('#inner').css('top'));
		var offsetLeft = 0;
		var offsetTop = 0;
		if(left < 0) offsetLeft = -left;
		if(top < 0) offsetTop = -top;
		
		$("#canvas").attr('width', $['mapsettings'].element.width() - left).attr('height', $['mapsettings'].element.height() - top);
		$('#canvas').css('left', offsetLeft).css('top', offsetTop);
				
		$(window).resize(function(e) {
         resizeCanvas();
    });

		$('#zoom_in').click(function(e){
				e.preventDefault();
				scaleCanvas();
				resizeCanvas();
		});
		
		$('#zoom_out').click(function(e){
			e.preventDefault();
			scaleCanvas();
			resizeCanvas();
		});
		
		// Code used to ensure that the zoom slider is undated to the current position
		var zoomMouseUp = function(e) {
			if(typeof($['mapsettings'].beforeZoom) == 'undefined') return true;
			var zoom = parseInt(parseInt($('#zoomSlide').css('left'))/$('#zoomSlide').width())+1;
			scaleCanvas();
			resizeCanvas();
		}
		$('#zoomSlide').mouseup(zoomMouseUp);
		
		$('#zoomSlider').mouseleave(zoomMouseUp);
		
		$('#zoomSlider').click(function(e){
			e.preventDefault();
			var x = e.pageX - parseInt($($(this).parent().get(0)).css('left'));
			$['mapsettings'].beforeZoom = $['mapsettings'].zoom;
			var zoom = parseInt(x/$('#zoomSlide').width());
			scaleCanvas();
			resizeCanvas();
		});
		
		// If the map was moved, move the canvas... will become unnecessary when elements have own canvas.
		$['mapsettings'].element.bind('mapMoved', function(e){
      resizeCanvas();
		});
		
		// Onmousmove move point action function
		var movePoint = function(e) {
			e.preventDefault();
			var point = new Point((e.pageX - parseInt($('#inner').css('left')))/$['mapsettings'].scale.x, (e.pageY - parseInt($('#inner').css('top')))/$['mapsettings'].scale.y);
			document.body.focus();

      // prevent text selection in IE
      document.onselectstart = function () { return false; };
      // prevent IE from trying to drag an image
			if(e.srcElement)
      	e.srcElement.ondragstart = function() { return false; };
			
			sets.annotations.getSelected().moveSelected(point);
			sets.annotations.draw();
		}
		
		// Onmousmove + shift add point in between action function
		var moveCtrlPoint = function(e) {
			e.preventDefault();
			var point = new Point((e.pageX - parseInt($('#inner').css('left')))/$['mapsettings'].scale.x, (e.pageY - parseInt($('#inner').css('top')))/$['mapsettings'].scale.y);
			document.body.focus();

      // prevent text selection in IE
      document.onselectstart = function () { return false; };
      // prevent IE from trying to drag an image
			if(e.srcElement)
      	e.srcElement.ondragstart = function() { return false; };
			if($['mapsettings'].annotations.getSelected().selectedDistanceTo(point) > (10/$['mapsettings'].scale.x)) {
				var towards = $['mapsettings'].annotations.getSelected().movingClosestToNeighbor(point);
				$['mapsettings'].annotations.getSelected().addNextTo(point, towards);
				$("#tiles").unbind('mousemove', moveCtrlPoint);
				$("#tiles").mousemove(movePoint);
			}
		}
		
		var selectDown = function(e){
			var point = new Point((e.pageX - parseInt($('#inner').css('left')))/$['mapsettings'].scale.x, (e.pageY - parseInt($('#inner').css('top')))/$['mapsettings'].scale.y);
			if(sets.annotations.length() < 1) var id = -1;
			else var id = sets.annotations.getSelected().isPoint(point);
			if(id != -1) {
				sets.annotations.getSelected().selectPoint(id);
				$("#tiles").mousemove(movePoint);
			}
		};
	
		var selectUp = function(e){
				$("#tiles").unbind('mousemove', movePoint);
		};
		
		$("#tiles").mousedown(selectDown).mouseup(selectUp);
		
		// Delete point action
		$(document).keydown(function(e){
			var sets = $['mapsettings'];
			if((e.which == 8 || e.which == 46) && (sets.action == 'Polygons' || sets.action == 'Polyline') && !$['mapsettings'].modal) {
				e.preventDefault();
				if(sets.annotations.getSelected().length() > 1) {
					sets.annotations.getSelected().removeSelectedPoint();
					sets.annotations.draw();
				}
				return false;
			}
		});
		
		var ctrlDown = function(e) {
			e.preventDefault();
			var point = new Point((e.pageX - parseInt($('#inner').css('left')))/$['mapsettings'].scale.x, (e.pageY - parseInt($('#inner').css('top')))/$['mapsettings'].scale.y);
			if(sets.annotations.length() < 1) var id = -1;
			else var id = sets.annotations.getSelected().isPoint(point);
			if(id != -1) {
				sets.annotations.getSelected().selectPoint(id);
				$['mapsettings'].annotations.getSelected().storeDistancesTo(point);
				$("#tiles").mousemove(moveCtrlPoint);
			}
		}
		
		var ctrlUp = function(e) {
			e.preventDefault();
			$("#tiles").unbind('mousemove',moveCtrlPoint);
		}
		
		// Depending on whether shift button is held down, determines if user is adding in-between point or moving it. 
		$(document).keydown(function(e){
			if(e.which == 16 && (sets.action == 'Polygons' || sets.action == 'Polyline')) {
				$("#tiles").mousedown(ctrlDown).mouseup(ctrlUp);
				$("#tiles").unbind('mousedown',selectDown)
				$("#tiles").unbind('mouseup', selectUp);
			}
		}).keyup(function(e){
			if(e.which == 16 && (sets.action == 'Polygons' || sets.action == 'Polyline')) {
				$("#tiles").unbind('mousedown',ctrlDown).unbind('mouseup',ctrlUp);
				$("#tiles").mousedown(selectDown).mouseup(selectUp);
			}
		});
		
		// Add Point action function
		var canvasAction = function(e) {
			// Gets the point the user clicked on
			var point = new Point((e.pageX - parseInt($('#inner').css('left')))/$['mapsettings'].scale.x, (e.pageY - parseInt($('#inner').css('top')))/$['mapsettings'].scale.y);
			if(sets.annotations.length() < 1) var id = -1;
			else var id = sets.annotations.getSelected().isPoint(point);
			if(id != -1) { // If there is a point where the user clicked, select the point
				sets.annotations.getSelected().selectPoint(id);
				$['mapsettings'].point_move = true;
			} else {
				$['mapsettings'].point_move = false;
				// If there are no selected annotations of the type of action currently selected add new annotation
				if(sets.annotations.length() < 1 || sets.annotations.selectedType() != $['mapsettings'].action) {
					$['mapsettings'].afterModal.push(function() {
						var value = $['mapsettings'].value;
						if(value) createNewAnnotation($['mapsettings'].action);
					});
					mapConfirm('You need to create an annotation before adding points.', "Do you want to create new " + $['mapsettings'].action + '?');
 				}
				else {
					sets.annotations.getSelected().addPoint(point);
				}
			}
			sets.annotations.draw();
		}
		
		var move = $['mapsettings'].move;
		resizeCanvas();
		
		var infoWindowControl = function(e) {
			e.preventDefault(); openInfoWindow(e, this);
		}
		
		var deselectAll = function() {
			var actions = $('#actions li.selected').removeClass('selected');
			$("#tiles").unbind('click', canvasAction);
			$("#tiles").unbind('mousedown',selectDown)
			$("#tiles").unbind('mouseup', selectUp);
			$("#tiles").unbind('mousedown', $['mapsettings'].mousedown);
			$("#tiles").unbind('mouseup', $['mapsettings'].mouseup);
			$("#canvas").unbind('click', infoWindowControl);
		}
		
		$("#controls").append('<ul id = "actions"><li class = "selected"><a href = "#" id = "hand" title = "Move">Move</a></li><li><a href = "#" id = "polygons" title = "Create and Edit polygons">Create and Edit Polygons</a></li><li><a href = "#" id = "polylines" title = "Create and Edit Polylines">Polylines</a></li><li><a href = "#" id = "points" title = "Create and Edit Annotation Points">Points</a></li></ul>');
		// Select moving action 
		$("#hand").click(function(e) {
			e.preventDefault();
			$['mapsettings'].action = 'hand';
			deselectAll();
			var move = $['mapsettings'].move;
			$("#tiles").mouseup($['mapsettings'].mouseup).mousedown($['mapsettings'].mousedown);
			$($(this).parent().get(0)).addClass('selected');
			$("#tiles").css('cursor', 'move');
			$("#tiles").css('cursor', '-webkit-grab');
			$("#tiles").css('cursor', '-moz-grab');
		});
		// Select polygons action
		$('#polygons').click(function(e) {
			e.preventDefault();
			$['mapsettings'].action = 'Polygons';
			deselectAll();
			$('#tiles').click(canvasAction);
			$("#tiles").mousedown(selectDown).mouseup(selectUp);
			$($(this).parent().get(0)).addClass('selected');
			$("#tiles").css('cursor', 'default');
		});
		// Select Polylines action
		$('#polylines').click(function(e) {
			e.preventDefault();
			$['mapsettings'].action = 'Polyline';
			deselectAll();
			$('#tiles').click(canvasAction);
			$("#tiles").mousedown(selectDown).mouseup(selectUp);
			$($(this).parent().get(0)).addClass('selected');
			$("#tiles").css('cursor', 'default');
		});
		
		
		// Select points action
		$('#points').click(function(e) {
			e.preventDefault();
			$['mapsettings'].action = 'annotations';			
			deselectAll();
			$('#canvas').click(infoWindowControl);
			
			$($(this).parent().get(0)).addClass('selected');
			$("#tiles").css('cursor', 'default');
		});
	}
	
	function drawAllAnnotations() {
		this.annotations.draw();
	}
	
	// Calculates the scale of the canvas depending on the current zoom level to stretch annotation to zoom level
	function scaleCanvas() {
		var ctx = $['mapsettings'].ctx;
		var scalevalue = new Point(1,1);
		var scale = getRelativeScale($['mapsettings'].zoom);	
		scale.x = scale.x * scalevalue.x;
		scale.y = scale.y * scalevalue.y;
		$['mapsettings'].scale = scale;
	}
	
	// Will clear the canvas .. again not as usefull after new annotation display method implemented
	function clearCanvas() {
		var ctx = $['mapsettings'].ctx;
		var left = parseInt($('#inner').css('left'));
		var top = parseInt($('#inner').css('top'));
		var offsetLeft = 0;
		var offsetTop = 0;
		if(left < 0) offsetLeft = -left;
		if(top < 0) offsetTop = -top;	 
		ctx.clearRect(offsetLeft/$['mapsettings'].scale.x, offsetTop/$['mapsettings'].scale.y, ($['mapsettings'].element.width() - left)/$['mapsettings'].scale.x, ($['mapsettings'].element.height() - top)/$['mapsettings'].scale.y);
	}
	
	function resizeCanvas() {
		sets.annotations.draw();
	}
	
	function addAnnotationControls() {
		$('#map').append('<div id = "annotationControls"><div class = "second"><div class = "annTop"><ul></ul><a id = "annSmall" /></div><div id = "annLayers"></div></div></div>');
		$('.annTop ul').append('<li><a href = "#" id = "allAnn">All Annotations</a></li>');
		$('.annTop ul').append('<li><a href = "#" id = "myAnn" >Create Annotations</a></li>');
		$('#annLayers').append('<div id = "annAll"></div><div id = "annMy" style = "display:none"></div><ul id = "annAR" style = "display:none"><li><a href = "#" id = "annA">+</a></li><li><a href = "#" id = "annR">-</a></li></ul>');
		
		$("#allAnn").attr('class', 'current');
		
		// Actions to control tab display on annotation selector window
		$('#allAnn').click(function(e){
			e.preventDefault();
			$('#annMy').hide();
			$('#annAll').show();
			$('#annAR').hide();
			$("#allAnn").attr('class', 'current');
			$('#myAnn').attr('class', '');
		});
		
		$('#myAnn').click(function(e){
			e.preventDefault();
			$('#annMy').show();
			$('#annAR').show();
			$('#annAll').hide();
			$(this).attr('class', 'current');
			$('#allAnn').attr('class', '');
		});
		
		$('#annSmall').attr('href', '#').toggle(function(e) {
			e.preventDefault();
			$('#annotationControls').attr('class', 'small');
		}, function(e) {
			e.preventDefault();
			$('#annotationControls').attr('class', 'large');
		}).append('small');
		
		// [+] button action
		$('#annA').click(function(e){
			e.preventDefault();
						
			$['mapsettings'].afterModal.push(function() {
					var type = $['mapsettings'].value;
					createNewAnnotation(type);
				});
			mapDecide('Kind of Annotation:', 'Choose the kind of annotation do you want to create?', ['Polygons','Polyline'], 'Next&rarr;', false);
		});
		 
		// [-] button action
		$("#annR").click(function(e) {
			var sets = $['mapsettings'];
			e.preventDefault();
			if(sets.annotations.length() > 0)
				mapConfirm('Do you wish to remove this annotation?', 'Remove annotation ' + sets.annotations.getSelected().name + '?');
			
			var confirm = function() {
				$['mapsettings'].element.unbind('finishPrompt', confirm);
				//If confirmed mapsettings.value should be true
				if($['mapsettings'].value)
					$['mapsettings'].annotations.removeSelected();
				fillMyAnnotations();
			}
			$['mapsettings'].element.bind('finishPrompt', confirm);
		});
		
		// Temporary save function for annotations
		$("<a />").attr('href', '#').click(function(e) {
			e.preventDefault();
			
			$['mapsettings'].annotations.each(function(i, item){
				if(item.dirty) {
					var save = item.serialize();
					$.post(sets.save_url, save, function(data) { console.log(data); }, 'json');	
					item.clean();
				}
			});
		}).append('Save Annotations').attr('id', 'save').appendTo('#controls');
		
	}
	
	// Displayed dialog asking user for annotation information, then adds it.
	function createNewAnnotation(type) {
		$['mapsettings'].afterModal.push(function() {
			var name = $['mapsettings'].value;
			if(type == "Polygons") {
				var annotation = new Polygons(name);
				var poly = new Polygon;
				annotation.addPolygon(poly);
				statusConfirm('Create the polygon on the <strong>top layer</strong> of structure.', 'Done', function() {
					sets.annotations.getSelected().setTopLevel(parseInt($['mapsettings'].level));
					statusConfirm('Manipulate layer for the polygon on the <strong>bottom layer</strong> of structure.', 'Done', function(){
						sets.annotations.getSelected().setBottomLevel(parseInt($['mapsettings'].level));
					});
				});
			} else if(type == "Polyline") {
				var annotation = new Polylines(name);
				var poly = new Polyline;
				annotation.addPolyline(poly);
				statusConfirm('Create the polyline on the <strong>top layer</strong> of structure.', 'Done', function() {
					sets.annotations.getSelected().setTopLevel(parseInt($['mapsettings'].level));
					statusConfirm('Manipulate layer for the polyline on the <strong>bottom layer</strong> of structure.', 'Done', function(){
						sets.annotations.getSelected().setBottomLevel(parseInt($['mapsettings'].level));
					});
				});
			}
			annotation.index = $['mapsettings'].annotations.length;
			$['mapsettings'].annotations.addAnnotation(annotation);
			fillMyAnnotations();
			$('#myAnn').click();
			if($['mapsettings'].action != type)
				mapInform('Annotation Added.', 'Your annotation has been added. Click on the ' + type + ' button on the left to add points to the annotation.');	
		});
				
		mapPrompt('Name the Annotation:', 'What is intended name for this annotation?', 'Add', false);
	}
	
	// Will fill annotation list box with current information
	function fillMyAnnotations() {
		$('#annMy').html('<ul/>');
		var sets = $['mapsettings'];
		sets.annotations.each(function(i,item) {
			var theClass = 'class = "' + item.className;
			var active = '';
			var subtract = '';
			var subtractClass = '';
			if(!item.isactive()) active = ' inactive'; 
			if(item.className == 'Polygons') {
				if(item.isSubtract()) { subtractClass = ' selected'; }
				if(item.isSelected()) { theClass += ' selected'; subtract = '<li class = "subtract'+subtractClass+'" id = "subtract'+i+'">Subtraction.</li>'; }
			} else if(item.className == 'Polyline') {
				if(item.isSelected()) { theClass += ' selected'; }
			}
			$('#annMy ul').append('<li id = "annotation' + i + '"' + theClass + '"><span class = "color" style = "background-color:#' + item.getHexColor() + '"></span><h2>' + item.name + '</h2><a href = "#" class = "annShow' + active +'" id = "annShow' + i + '">show</a></li>' + subtract);
		});
		
		// Select annotation action
		$('#annMy li').click(function(e){
			if($(this).hasClass('subtract')) {
				$['mapsettings'].annotations.selectSubtract();				
			} else {
				$['mapsettings'].annotations.deselectSubtract();				
				var id = $(this).attr('id').replace('annotation','');
				$['mapsettings'].annotations.select(id);
			}
			fillMyAnnotations();
			$['mapsettings'].annotations.draw();
		});
		
		// Show/Hide annotation action
		$('.annShow').click(function(e) {
			e.preventDefault();
			var id = $(this).attr('id').replace('annShow','');
			if($(this).hasClass('inactive')) {
				$['mapsettings'].annotations.getAnnotation(id).activate();
			} else {
				$['mapsettings'].annotations.getAnnotation(id).deactivate();
			}
			fillMyAnnotations();
			$['mapsettings'].annotations.draw();
		});
		
		// Color Selector action
		$('.color').click(function() {
			mapColorPicker();
			var colorFunc =  function(){
				$['mapsettings'].element.unbind('finishPrompt', colorFunc);
				var i = $['mapsettings'].value;
				$['mapsettings'].annotations.getSelected().setFromColors(i);
				fillMyAnnotations();
			};
			$['mapsettings'].element.bind('finishPrompt', colorFunc);
			
		});
	}
	
	// Will create the slider for zoom levels 
	function buildZoomSlider() {
		$('#zoom_in').after('<div id = "slider"><div id = "zoomSlider"><div id = "zoomLevels"></div><div id = "zoomSlide"></div></div></div>');
		var add = 140/$['mapsettings'].zoom_levels; // 140 width of zoom slider, 
																							  // there were problems with dynamicly getting value so it is 
																								// hard coded right now as a hack
		var left = 0;
		for(var i=0;i<$['mapsettings'].zoom_levels;i++) {
			$('<span id = "zoomLevel'+(i+1)+'"></span>').css('left', left).appendTo('#zoomLevels');
			left += add;
		}
		$('#zoomSlide').css('width', add);
		
		// Clicking on zoom slider at level action
		$('#zoomSlider').click(function(e){
			e.preventDefault();
			var x = e.pageX - parseInt($($(this).parent().get(0)).css('left'));
			$['mapsettings'].beforeZoom = $['mapsettings'].zoom;
			var zoom = parseInt(x/$('#zoomSlide').width())+1; // Gets intended zoom level by where on slider clicked
			if(zoom != sets.zoom) {
				zoomTo(zoom);
				$('#zoomSlide').css('left', (zoom-1)*$('#zoomSlide').width());
			}
		});
		
		// Actions for the dragging of slider
		var zoommove = function(e) {
			var x = e.pageX;
			var left = $['mapsettings'].initSlideLeft+(x-$['mapsettings'].initSlideX);
			if(left >= 0 && left <= ($('#zoomSlider').width()-$('#zoomSlide').width())){
				if(Math.abs(left%$('#zoomSlide').width())<15) { // 15 used to smooth out sliding
					var mult = parseInt(left/$('#zoomSlide').width());
					$('#zoomSlide').css('left', (mult)*$('#zoomSlide').width());
				}
			}
		}
		
		var mouseup = function(e){
			e.preventDefault();
			$('#zoomSlider').unbind('mousemove', zoommove);
			var zoom = parseInt(parseInt($('#zoomSlide').css('left'))/$('#zoomSlide').width())+1;
			zoomTo(zoom);
		}
		
		$('#zoomSlide').mousedown(function(e){
			e.preventDefault();

			document.body.focus();

      // prevent text selection in IE
      document.onselectstart = function () { return false; };
      // prevent IE from trying to drag an image
			if(e.srcElement)
      	e.srcElement.ondragstart = function() { return false; };


			$['mapsettings'].initSlideX    = e.pageX;
			$['mapsettings'].initSlideLeft = parseInt($('#zoomSlide').css('left'));
			
			$("#zoomSlider").mousemove(zoommove);
			$['mapsettings'].beforeZoom = $['mapsettings'].zoom;
			
		}).mouseup(mouseup);
				
		// Mouseleave event ensures that when sliding and moved away from slider, sliding action ends.
		$('#zoomSlider').mouseleave(mouseup);
	}
	
	// Updates zoom slider with current zoom level if changed do to other sources
	function updateZoomSlider() {
		var left = ($('#zoomSlider').width()/$['mapsettings'].zoom_levels)*($['mapsettings'].zoom-1);
		$('#zoomSlide').css('left', left);
	}
	
	// Will add marker to map using action information (e and current) with an option to pass in a onclick function
	function addMarkerEvent(e, current, action) {
		var sets = $['mapsettings'];
		if(!action) { action = function(e) { e.preventDefault(); } }
		var x = e.pageX - parseInt($('#inner').css('left')) - $['mapsettings'].element.get(0).offsetLeft - 9;
		var y = e.pageY - parseInt($('#inner').css('top')) - $['mapsettings'].element.get(0).offsetTop - 10;
		$("<li />").attr('id', 'marker' + sets.markers.length).css('left',x).css('top',y).html('<a href = "#"><img src = "/maps/img/marker.png"></a>').appendTo('#markers');
		sets.markers.push($("marker" + (sets.markers.length-1)));
	}
	
	// Will add marker to map based on point infomation with an option to pass onclick function
	function addMarker(point, action) {
		var sets = $['mapsettings'];
		if(!action) { action = function(e) { e.preventDefault(); } }
		var x = point.x;
		var y = point.y;
		$("<li />").attr('id', 'marker' + sets.markers.length).css('left',x).css('top',y).html('<a href = "#"><img src = "/maps/img/marker.png"></a>').appendTo('#markers');
		sets.markers.push($("#marker" + (sets.markers.length)));
		sets.markerLocations[sets.markers.length-1] = [];
		sets.markerLocations[sets.markers.length-1][sets.zoom] = new Point(x,y);
		$("#marker" + (sets.markers.length-1) + " a").click(action);
	}
	
	// Returns a point with the location of a marker
	function markerPoint(current) {
		var $this = $(current);
		var li = $($this.parents()[0]);
		return new Point(parseInt(li.css('left')),parseInt(li.css('top')));
	}
	
	// Repositions markers for new zoom level.
	function repositionMarkers(zoom) {
		var sets = $['mapsettings'];
		$.each(sets.markers, function(i,item){
			if(typeof(sets.markerLocations[i][zoom]) != 'undefined') {
				item.css('left', sets.markerLocations[i][zoom].x).css('top', sets.markerLocations[i][zoom].y);
			} else {
				var point = new Point(parseInt(item.css('left')), parseInt(item.css('top')));
				var offset = getPointZoomOffset(point, zoom);
				sets.markerLocations[i][zoom] = offset;
				item.css('left', offset.x).css('top', offset.y);
			}
		});
	}
	
	// Repositioned opened infowindow for new zoom level
	function repositionInfoWindow(zoom) {
		if(!$['mapsettings'].hasOpenInfoWindow) return true;
		if(typeof($['mapsettings'].infoWindowLocation[zoom]) != 'undefined') {
			offset = $['mapsettings'].infoWindowLocation[zoom];
		} else {
			point = $['mapsettings'].infoWindowLocation[sets.zoom];
			offset = getPointZoomOffset(point, zoom);
			$['mapsettings'].infoWindowLocation[zoom] = offset;
		}
		$("#infowindows img").css('left',offset.x).css('top',offset.y-15);
		var infow = $('#infowindow').css('left',offset.x).css('top',offset.y-15).hide();
		infoHeight = infow.innerHeight();
		infow.css('left', offset.x-4).css('top',offset.y-16-infoHeight).show();
	}
	
	// Close opened info window.
	function closeInfoWindow() {
		$('#infowindows').html('');
		$['mapsettings'].infoWindowLocation = [];
		$['mapsettings'].hasOpenInfoWindow = false;
	}
	
	// Open infowindow and display infoDisplay information
	function openInfoWindow(e, current) {
		closeInfoWindow(); 
		var x = e.pageX - parseInt($('#inner').css('left')) - $['mapsettings'].element.get(0).offsetLeft - 9;
		var y = e.pageY - parseInt($('#inner').css('top')) - $['mapsettings'].element.get(0).offsetTop - 10;
		$['mapsettings'].infoWindowLocation[$['mapsettings'].zoom] = new Point(x,y);
		$('<div id = "infowindow" />').css('left',x-4).css('top',y-53).html('<div class = "inner">'+ $['mapsettings'].exitLink + $['mapsettings'].infoDisplay + '</div>').appendTo('#infowindows').hide();
		var infow = $('#infowindow');
		infoWidth = infow.innerWidth();
		infoHeight = infow.innerHeight();
		infow.css('left', x-4).css('top',y-16-infoHeight).show();
		$("#infowindows").append($['mapsettings'].infoImage);
		$("#infowindows img").css('left',x).css('top',y-15);
		$('#infowindows form').submit(function(e) { 
			e.preventDefault(); 
			closeInfoWindow();
			addMarker(new Point(x,y), function(e){
				e.preventDefault();
				openInfoWindowHtml(markerPoint(this), "<h2>Some Name</h2><p>Some Description.</p>");
			});
			
		 });
		$("#exitLink").click(function(e){
			e.preventDefault();
			closeInfoWindow();
			return false;
		});
		$['mapsettings'].hasOpenInfoWindow = true;
	}
	
	// Open infowinow with custom html information
	function openInfoWindowHtml(point, html) {
		closeInfoWindow();
		var x = point.x;
		var y = point.y;
		$['mapsettings'].infoWindowLocation[$['mapsettings'].zoom] = new Point(x,y);
		$('<div id = "infowindow" />').css('left',x-4).css('top',y-53).html('<div class = "inner">' + $['mapsettings'].exitLink + html + '</div>').appendTo('#infowindows').hide();
		var infow = $('#infowindow');
		infoWidth = infow.innerWidth();
		infoHeight = infow.innerHeight();
		infow.css('left', x-4).css('top',y-16-infoHeight).show();
		$("#infowindows").append($['mapsettings'].infoImage);
		$("#infowindows img").css('left',x).css('top',y-15);
		$("#exitLink").click(function(e){
			e.preventDefault();
			closeInfoWindow();
			return false;
		});
		$['mapsettings'].hasOpenInfoWindow = true;
	}
	
	
	function Point(x,y) {
		this.x = x;
		this.y = y;
	}
	
	// Stores the dimentions of element with id=inner
	function getInnerDimentions() {
		var inner = $("#inner");
		$['mapsettings'].initTop = parseInt(inner.css('top'));
		$['mapsettings'].initLeft = parseInt(inner.css('left'));
	}
	
	// Sets new dimentions for element with id=inner
	function setInnerDimentions(point) {
		var inner = $("#inner");
		inner.css('top',point.y);
		inner.css('left',point.x);
		getInnerDimentions();
	}
	
	// Moves the map to be centered on a point location
	function moveMap(point) {
		var sets = $['mapsettings'];
		var $this = sets.element;
		// To center the map to point, get width & height centers and subtract the point location.
		var location = new Point(($this.innerWidth()/2)-(point.x),($this.innerHeight()/2)-(point.y))
		setInnerDimentions(location);
	}
	
	// Returns the point in the center of the viewport
	function getCenterXY() {
		var sets = $['mapsettings'];
		var $this = sets.element;
		var centerx = ($this.innerWidth()/2)-parseInt($('#inner').css('left'));
		var centery = ($this.innerHeight()/2)-parseInt($('#inner').css('top'));
		return new Point(centerx,centery);
	}
	
	// Converts center point in current zoom level to another zoom level. 
	// Can be made simpler now that a double ration for zoom levels is enforced.
	function getZoomOffset(zoom) {
		sets = $['mapsettings'];
		var xy = getCenterXY();
		var percentxy = new Point((xy.x/sets.resolutions[sets.zoom-1].width),(xy.y/sets.resolutions[sets.zoom-1].height));		
		var offset = new Point(Math.round(percentxy.x*sets.resolutions[zoom-1].width),Math.round(percentxy.y*sets.resolutions[zoom-1].height));
		return offset;
	}
	
	// Gets the multiplicative difference from one zoom level to another, usefull for resizing annotations
	function getScale(to,from) {
		sets = $['mapsettings'];
		var percentxy = new Point((sets.resolutions[to-1].width/sets.resolutions[0].width),(sets.resolutions[to-1].height/sets.resolutions[0].height));	
		return percentxy;
	}
	
	// Gets the multiplicative difference from one zoom level to another, usefull for resizing annotations
	function getRelativeScale(to) {
		sets = $['mapsettings'];
		var percentxy = new Point((sets.resolutions[to-1].width/sets.resolutions[sets.resolutions.length-1].width),(sets.resolutions[to-1].height/sets.resolutions[sets.resolutions.length-1].height));	
		return percentxy;
	}
	
	// Returns the point in the requested zoom level, again can be made simpler with 2* restriction
	function getPointZoomOffset(xy, zoom) {
		sets = $['mapsettings'];
		var percentxy = new Point( ((xy.x*100/sets.resolutions[sets.zoom-1].width)/100) ,((xy.y*100/sets.resolutions[sets.zoom-1].height)/100));
		var offset = new Point(percentxy.x*sets.resolutions[zoom-1].width,percentxy.y*sets.resolutions[zoom-1].height);
		return offset;
	}
	
	// Returns the specified point as a point in the highest zoom level
	function getAbsolutePoint(xy) {
		sets = $['mapsettings'];
		var percentxy = new Point( ((xy.x*100/sets.resolutions[sets.zoom-1].width)/100) ,((xy.y*100/sets.resolutions[sets.zoom-1].height)/100));
		var offset = new Point(percentxy.x*sets.resolutions[sets.resolutions.length-1].width,percentxy.y*sets.resolutions[sets.resolutions.length-1].height);
		return offset;
	}
	
	// Returns the specified point in the highest zoom level as a point in the current zoom level
	function getRelativePoint(xy) {
		sets = $['mapsettings'];
		var percentxy = new Point( ((xy.x*100/sets.resolutions[sets.resolutions.length-1].width)/100) ,((xy.y*100/sets.resolutions[sets.resolutions.length-1].height)/100));
		var offset = new Point(percentxy.x*sets.resolutions[sets.zoom-1].width,percentxy.y*sets.resolutions[sets.zoom-1].height);
		offset = new Point(Math.round(offset.x), Math.round(offset.y));
		return offset;
	}
	
	// Returns the range of pixels requested by user to be displayed in viewport
	function getPixelRange() {
		$this = $['mapsettings'].element;
		var xstart = 0;
		var ystart = 0;
		if($['mapsettings'].initLeft<0) xstart = Math.abs($['mapsettings'].initLeft);
		if($['mapsettings'].initTop<0) ystart = Math.abs($['mapsettings'].initTop);
		xstart = getFirstXPosInRange(xstart);
		// Makes sure that ystart values are multiples of 256 and start before viewport
		if(ystart%256!=0) ystart=((parseInt(ystart/256))-1)*256;
		var xend = $this.innerWidth() - $['mapsettings'].initLeft;
		var yend = $this.innerHeight() - $['mapsettings'].initTop;
		return {
			"start": {
				"x": xstart,
				"y": ystart
			},
			"end": {
				"x": xend,
				"y": yend
			}
		};
	}
	
	// Returns true if point in zoom level is currently in range for current viewport
	function notInRange(z,point) {
		var x = point.x;
		var y = point.y;
		var range = getPixelRange();
		return (z!=$['mapsettings'].zoom || x<range.start.x || x>range.end.x || y<range.start.y || y>range.end.y);
	}
	
	// Will resize the map DIV to take up entire screen.
	function resizeDiv() {
		$this = $['mapsettings'].element;
		var divsize = "width:" + $this.parent().get(0).clientWidth + "px; height: " + $(window).height() + 'px;';
	  $this.attr('style', divsize);		
		var divsize = "width:" + ($this.parent().get(0).clientWidth - $this.get(0).offsetLeft) + "px; height: " + ($(window).height()-$this.get(0).offsetTop) + 'px;';
	  $this.attr('style', divsize);		
		loadImages();
	}
	
	// Returns true if an image col and pixel values are currently loaded based on loaded hash.
	function isLoaded(col,i,j) {
		return (typeof($['mapsettings'].loaded[$['mapsettings'].zoom+"-"+col+"-"+i+"-"+j]) != "undefined" && $['mapsettings'].loaded[$['mapsettings'].zoom+"-"+col+"-"+i+"-"+j]);
	} 
	
	// Removes images from element if they are no longer in the viewport
	function removeUnseenImages() {
		var images = $("#images img");
		$.each(images, function(i,item) {
			var $item=$(item);
			var pos = $item.attr('class').replace('file','').split('-');
			var point = new Point(parseInt($item.css('left')), parseInt($item.css('top')));
			if(notInRange(pos[0],point)) {
				$item.remove();
				$['mapsettings'].loaded[pos[0]+"-"+pos[1]+"-"+pos[2]+"-"+pos[3]] = false;
			}
		});
	}
	
	// Given a x pixel position, returns the column number it is in.
	function getColumn(x) {
		var col = 0;
		x = getAbsolutePoint(new Point(x,0));
		x = x.x+5; // Adds five probably not necessary, but insures x is squarely in the col
		$.each($['mapsettings'].columns, function(i, item) {
			if(x>=item) col = i;
		});
		return col+1; // add one because column count starts from one
	}
	
	// Returns the pixel location that a col starts at current zoom level
	function getRelativeColStart(col) {
		var loc = new Point(sets.columns[col],0);
		var offset = getRelativePoint(loc);
		return offset.x;
	}
	
	// Function to determine how much pixels to add to get to next images (not just 256 because of cols)
	function addi(i) {
		var sets = $['mapsettings'];
		if(sets.columns.length == 1) return 256; // Optimization: If only one col always use 256px
		var col = getColumn(i);
		if( ((i+256) - getRelativeColStart(col)) < 256 && ((i+256) - getRelativeColStart(col)) > 0 ) {
			return firstInColumnLocation(col)-i; // If next image is new col get diffence from it is
																					 // to where you currently are
		} else
			return 256;
	}
	
	// Returns the first x pixel in column at current zoom level
	function firstInColumnLocation(col) {
		var sets = $['mapsettings'];
		var point = new Point(sets.columns[col],0);
		var offset = getRelativePoint(point);
		return offset.x;
	}
	
	// Returns first x pixel in range
	function getFirstXPosInRange(x) {
		var col = getColumn(x)-1; // -1 because col array starts from 0 while column numbers start from 1
		var start = firstInColumnLocation(col);
		for(var i=firstInColumnLocation(col);i<x;i+=256) {
			start = i;
		}
		return start;
	}
	
	// Loads images to the viewport display based on range information
	function loadImages() {
		removeUnseenImages();
		var sets = $['mapsettings'];
		var range = getPixelRange();
		for(var i=range.start.x; i<range.end.x && i<sets.resolutions[sets.zoom-1].width; i+=addi(i)) {
			for(var j=range.start.y; j<range.end.y && j<sets.resolutions[sets.zoom-1].height; j+=256) {
				var col = getColumn(i);
				if(!isLoaded(col,i,j)) { // Prevent already loaded images from being reloaded
					var imgurl = sets.image_name.replace(/%Z/, sets.zoom );
					imgurl = imgurl.replace(/%L/, sets.level);
					imgurl = imgurl.replace(/%C/, col);
					imgurl = imgurl.replace(/%X/, (i-firstInColumnLocation(col-1)));
					imgurl = imgurl.replace(/%Y/, j);
					imgurl = sets.image_dir + imgurl;
					$['mapsettings'].loaded[sets.zoom+"-"+col+"-"+i+"-"+j] = true;
					var style = "top: " + j + "px; left: " + i + "px;"
					var theClass = "file" + sets.zoom + "-" + col +"-" + i + "-" + j;
					$("<img/>").attr("style", style).attr('class',theClass).appendTo("#images").hide();
					$("img." + theClass).load(function(e){ $(this).show(); }); // Only show the image once it is fully loaded
					$("img." + theClass).attr("src", imgurl);
				}
			}
		}
	}
	
	// Centers the image on map 
	function centerMap() {
		var sets = $['mapsettings'];
		var $this = sets.element;
		var location = new Point(($this.innerWidth()/2)-(sets.resolutions[sets.zoom-1].width/2),($this.innerHeight()/2)-(sets.resolutions[sets.zoom-1].height/2));
		setInnerDimentions(location);
	}
	
	// Opens a new modal box (pops down from top) displaying content, if allowExist=true will show close button
	function openModalBox(content, allowExit) {
		var sets = $['mapsettings'];
		sets.modal = true;
		
		sets.element.append('<div id = "overlay"></div>');
		sets.element.append('<div id = "modal" style = "display:none">' + content + '</div>');
		if(allowExit)	$('#modal').append('<a href = "#" id = "closeModal">Close</a>');
		$('#modal').slideDown("slow");
		$("#overlay").css('opacity', 0).fadeTo("slow", 0.5);
    
		$('#closeModal').click(function(e){ e.preventDefault(); closeModalBox(); }); 
	}
	
	// Close dialog box, and call the next function in afterModal stack
	function closeModalBox() {
		$['mapsettings'].modal = false;
		$('#modal').slideUp("slow", function(){
			$('#modal').remove();
		});
		$("#overlay").fadeTo("slow", 0, function() {
			$("#overlay").remove();
			if($['mapsettings'].afterModal.length > 0) ($['mapsettings'].afterModal.shift())();
		});
	}
	
	// Opens a modal prompt box (input box) and stores the resulting value in $[mapsettings].value
	function mapPrompt(title, question, submit, allowCancel) {
		var content = '<form id = "modalQuestion" action = "#" method = "post"><h2>' + title + '</h2>' + '<p><label for = "question">' + question + '</label> <input id = "question" type = "text" name = "question" value = "" /><input type = "submit" name = "submit" value = "' + submit + '" /></form>';
		openModalBox(content, allowCancel);
		$('#question').focus();
		$('#modalQuestion').submit(function(e) {
			e.preventDefault();
			var value = $('#question').val();
			$('#question').val("");
			$['mapsettings'].value = value;
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
	}
	
	// Opens a modal select box, given an array of choices allows the user to choose and stores result in $[mapsettings].value
	function mapDecide(title, question, choices, submit, allowCancel) {
		var content = '<form id = "modalQuestion" action = "#" method = "post"><h2>' + title + '</h2>' + '<p><label for = "question">' + question + '</label>'; 
		content += '<select id = "modalChoices" name = "modalChoices">';
		for(var i=0;i<choices.length;i++)
			content += '<option value = "' + choices[i] + '">' + choices[i] + '</option>';
		content += '</select>';
		content += '<input type = "submit" name = "submit" value = "' + submit + '" /></form>';
		openModalBox(content, allowCancel);
		$('#modalChoices').focus();
		$('#modalQuestion').submit(function(e) {
			e.preventDefault();
			var value = $('#modalChoices').val();
			$['mapsettings'].value = value;
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
	}
	
	// Opens a modal confirmation box, user can select yes or no to a question and the result will be stored in $[mapsettings].value
	function mapConfirm(title, question) {
		var content = '<form id = "modalConfirm" action = "#" method = "post"><h2>' + title + '</h2><p>' + question + '</p><p><input type = "submit" name = "Yes" value = "Yes" id = "modalYes" /><input type = "submit" name = "No" value = "No" id = "modalNo" /></p></form>';
		openModalBox(content, false);
		$('#modalYes').click(function(e){
			e.preventDefault();
			$['mapsettings'].value = true;
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
		$('#modalNo').click(function(e){
			e.preventDefault();
			$['mapsettings'].value = false;
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
	}
		
	// Will open a color picker box based on colors in $['mapsettings'].color, result will be stored in $['mapsettings'].value
	function mapColorPicker() {
		var content = "<h2>Pick a color from the list:</h2>";
		content += '<ul id = "colorPicker">';
		$.each($['mapsettings'].colors, function(i,item) {
			content += '<li><a href = "#" id = "modalColor' + i + '">';
			content += '<div style = "width:13px; height:13px; float:left; border:1px solid #999; background:#' + getHexColor(item.attr) + '"></div>';
			content += item.name + '</a></li>';
		});
		content += "</ul>";
		openModalBox(content, false);
		$('#colorPicker a').click(function(e) {
			e.preventDefault();
			$this = $(this);
			var i = $this.attr('id').replace('modalColor', '');
			$['mapsettings'].value = i;
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
	}
	
	// Will open an modal error box
	function mapError(title, message) {
		var content = '<div id = "error"><h2>' + title + '</h2><p>' + message + '</p> <a class = "button" href = "#" id = "mapErrorConfirm">OK</a></div>'; 
		openModalBox(content, false);
		$("#mapErrorConfirm").click(function(e){
			e.preventDefault();
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
	}
	
	// Will open a modal information box, user must click OK to continue
	function mapInform(title, message) {
		var content = '<h2>' + title + '</h2><p>' + message + '</p> <a class = "button" href = "#" id = "mapConfirm">OK</a>'; 
		openModalBox(content, false);
		$("#mapConfirm").click(function(e){
			e.preventDefault();
			closeModalBox();
			$['mapsettings'].element.trigger('finishPrompt');
		});
	}
	
	// Will open a status message box with content displayed
	function openStatusMessage(content) {
		sets.element.append('<div id = "mapStatus" style = "display:none">' + content + '</div>');		
		$('#mapStatus').slideDown("slow");
	}
	
	// Will open a status confirmation box, user must click confirm button to continue, optional function passed on close
	function statusConfirm(text, confirm, func) {
		var content = '<form id = "statusConfirm">' + text + '<input type = "submit" value = "'+ confirm +'" /></form>';
		
		openStatusMessage(content);
		
		if(!func)
			var callback = function(e) { e.preventDefault(); closeStatusMessage(); }
		else 
			var callback = function(e) { e.preventDefault(); closeStatusMessage(func); }
		
		$('#statusConfirm').submit(callback);
		
	}
	
	// Will close the status message box, optional function passed that will be called on close
	function closeStatusMessage(func) {
		$('#mapStatus').slideUp("slow", function(){
			$('#mapStatus').remove();
			if(func)
				func();
		});
	}
	
	// Returns the Hex version of a color stored as rgb value
	function getHexColor(color) { 
		return getHexValue(color.r) + getHexValue(color.g) + getHexValue(color.b);
	}
	
	// Returns a two digit hex value of a decimal number between 0-255
	function getHexValue(elem) {
		var value = elem.toString(16);
		if(value.length == 1) value = "0" + value;
		return value;
	}	
	
})(jQuery);