function Point(x,y) {
	this.x = x;
	this.y = y;
}

// Annotation class stores all currently viewing polygonal and polyline annotations
function Annotations(ctx) {
	this.colors = [
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
				];
	
	this.ctx = ctx;
	this.annotations = new Array();
	this.selected = -1; // Id of currently selected annotation
	this.currentSubtraction = -1;
	
	this.addAnnotation = function(annotation) {
		annotation.parent = this;
		annotation.id = this.selected = this.annotations.length;
		this.annotations.push(annotation);
	}
	
	this.removeAnnotation = function(id) {
		this.annotations = this.annotations.slice(0,id).concat( this.annotations.slice(id+1) );
		this.resetIds();
		if(this.selected > (this.length()-1)) this.selected--;
		this.draw();
	}
	
	this.removeSelected = function() {
		if(this.selected > -1)
			this.removeAnnotation(this.selected);
	}
	
	this.length = function() {
		return this.annotations.length;
	}
	
	this.getAnnotation = function(id) {
		return this.annotations[id];
	}
	
	this.getSelected = function(id) {
		return this.annotations[this.selected];
	}
	
	this.selectedType = function(id) {
		return this.getSelected().className;
	}
	
	this.select = function(id) {
		this.selected = id;
	}
	
	this.selectSubtract = function() {
		this.currentSubtraction = this.selected;
		this.getSelected().selectSubtract();
	}
	
	this.deselectSubtract = function() {
		if(this.currentSubtraction != -1)
			this.annotations[this.currentSubtraction].deselectSubtract();
	}
	
	this.selectNext = function(id) {
		this.selected++;
	}
	
	this.deselect = function() {
		this.selected = -1;
	}
	
	// Rescales and positions canvas and draws all annotations
	this.draw = function() {
		this.clearCanvas();
		var ctx = this.ctx;
		ctx.save(); // Saves scale and translation state for restoration at bottom
		var left = parseInt($('#inner').css('left'));
		var top = parseInt($('#inner').css('top'));
		var offsetLeft = 0;
		var offsetTop = 0;
		if(left < 0) { offsetLeft = -left; left = 0; }
		if(top < 0) { offsetTop = -top; top = 0; }
		$("#canvas").attr('width', $['mapsettings'].element.width() - left).attr('height', $['mapsettings'].element.height() - top);
		$('#canvas').css('left', offsetLeft).css('top', offsetTop);
		ctx.scale($['mapsettings'].scale.x, $['mapsettings'].scale.y);
		$['mapsettings'].translatex = (-offsetLeft/$['mapsettings'].scale.x);
		$['mapsettings'].translatey = (-offsetTop/$['mapsettings'].scale.y);
		ctx.translate($['mapsettings'].translatex, $['mapsettings'].translatey);
		jQuery.each(this.annotations, function(i,item){
			item.draw();
		});
		ctx.restore(); // Restores scale and translation states
	}
	
	// Clears the canvas in area above viewport
	this.clearCanvas = function() {
		var ctx = $['mapsettings'].ctx;
		var left = parseInt($('#inner').css('left'));
		var top = parseInt($('#inner').css('top'));
		var offsetLeft = 0;
		var offsetTop = 0;
		if(left < 0) offsetLeft = -left;
		if(top < 0) offsetTop = -top;	 
		ctx.clearRect(offsetLeft/$['mapsettings'].scale.x, offsetTop/$['mapsettings'].scale.y, ($['mapsettings'].element.width() - left)/$['mapsettings'].scale.x, ($['mapsettings'].element.height() - top)/$['mapsettings'].scale.y);
	}
	
	// Iterates over annotation with function
	this.each = function(callback) {
		$.each(this.annotations, callback);
	}
		
	// Reset the ids of the annotation to match indexes
	this.resetIds = function() {
		$.each(this.annotations, function(i, item){
			item.id = i;
		});
	}
}

// Superclass for Polygons and Polylines
function Annotation(name) {
	if(name)
		this.name = name;
		
	this.selected = -1;
	this.isSelected = function() { return(this.id == this.parent.selected); }
	this.setName = function() { this.name = name; }
	this.activate = function() { this.active= true; }
	this.deactivate = function() { this.active = false; }
	this.isactive = function() { return this.active; }
	this.deselect = function() { return this.polygons[this.selected].deselect(); }
	
	this.getColor = function() {
		return "rgba("+this.color.r+","+this.color.g+","+this.color.b+","+this.color.t+")";
	}
	
	this.setColor = function(r,g,b,t) { this.color = {"r":r,"g":g,"b":b,"t":t } }
	
	this.getHexColor = function() { 
		return this.getHexValue('r') + this.getHexValue('g') + this.getHexValue('b');
	}
	
	this.getHexValue = function(elem) {
		var value = this.color[elem].toString(16);
		if(value.length == 1) value = "0" + value;
		return value;
	}
	
	this.setFromColors = function(i) {
		var colors = this.parent.colors;
		this.color.r = colors[i].attr.r;
		this.color.g = colors[i].attr.g;
		this.color.b = colors[i].attr.b;
		this.parent.draw();
		this.dirty = true;
	}
		
}

function Polygons(name, polygon, index) {
	this.polygons = new Array();
	this.tempPolygon; // For storing currently interpolated polygon
	if(polygon) { this.polygons.push(polygon) };
	this.description = "";
	this.selected = -1;
	this.subtraction = false;
	this.active = true;
	this.interpolated = false;
	this.className = 'Polygons';
	this.color = {"r":255,"g":0,"b":0,"t":.3 };
	this.db_id = -1; // If stored not stored in database id = -1, else it is the primary key of the zPolygons in the DB 
	this.annotation_id = -1; // Primary key of Annotation in the database if annotation is stored in database
	this.range = { "top":-1, "bottom":-1 } 	// -1 means unbounded, the annotation will extend to the layers past the layer
											// if unbounded in direction. Numbers refer to the bounding layers if bounded.
	this.dirty = false;
	
	if(name)
		this.name = name;
	
	if(index)
		this.index = index;
	
	this.clean = function() { this.dirty = false; }	
	this.selectSubtract = function() { this.subtraction = true; }
	this.deselectSubtract = function() { this.subtraction = false; }
	this.isSubtract = function() { return this.subtraction; }		
	
	// Adds a polygon layer
	this.addZPolygon = function() {
		var polygon = new Polygon();
		if(this.interpolated)
			var from = this.tempPolygon;
		else
			var from = this.polygons[this.selected];
		polygon.points = from.points.slice(); // Copys points array
		polygon.subtractions = from.subtractions.slice();
		polygon.selected = from.selected;
		this.addPolygon(polygon);
	}
	
	// Adds a polygon to polygons list
	this.addPolygon = function(polygon) {
		polygon.annotation = this;
		polygon.index = this.polygons.length;
		this.polygons.push(polygon);
		this.selected = this.polygons.length-1;
		this.dirty = true;
		return this.selected;
	}
	
	// Remove a polygon from list.
	this.removePolygon = function(id) {
		// Removes by concatenating array up to id and array after id
		this.polygons = this.polygons.slice(0,id).concat( this.polygons.slice(id+1) );
		this.resetIds();
		if(this.selected > (this.length()-1)) this.selected--;
		this.draw();
		this.dirty = true;
	}
	
	// Determines if the level is in range of an annotation
	this.inRange = function(level) {
		if(this.range.top == -1 && this.range.bottom == -1) return true;
		if(this.range.bottom>=level && this.range.top==-1) return true;
		if(this.range.top<=level && this.range.bottom==-1) return true;
		if(this.range.top<=level && this.range.bottom>=level) return true;
		return false;
	}
	
	// Gets the annotation for the requested layer.. sometimes it returns keyframe layers otherwise interpolated layers
	this.getZPolygon = function(z) {
		if(!this.inRange(z)) return false;
		var polygon;
		var interpolation = this.interpolated = false;
		var before = -1; var after = -1;
		// Get copy of polygons array that is sorted by level, ascending order;
		var polygons = this.polygons.slice().sort(function(a,b){ return parseInt(a.level)-parseInt(b.level); });
		$.each(polygons, function(i,item){
			if(item.level==z) { 
				polygon = item; interpolation = false; 
			} else if(z>item.level) { 
				interpolation = true; before = i; 
			}
		});
		if(interpolation) {
			if(typeof(polygons[(before+1)]) != 'undefined') {
				polygon = this.tempPolygon = this.interpolate($['mapsettings'].level, polygons[before].index, polygons[before+1].index);
				polygon.index = polygons[before].index;
				polygon.selected = polygons[before].selected;
				this.selected = polygons[before].index;
				this.interpolated = true;
			} else {
				polygon = polygons[before];
			}
		} else
			this.selected = polygon.index;
		return polygon;
	}
	
	// Does the interpolation for the requested level
	this.interpolate = function(z, id1, id2) {
		// d = distance percentage from top
		if(this.tempPolygon && this.tempPolygon.level == z) return this.tempPolygon;
		var d = Math.abs(z-this.polygons[id1].level)/Math.abs(this.polygons[id1].level-this.polygons[id2].level);
		var points = new Array();
		for(var i=0;i<this.polygons[id2].points.length;i++) {
			var x = ((1-d)*this.polygons[id1].points[i].x) + (d*this.polygons[id2].points[i].x);
			var y = ((1-d)*this.polygons[id1].points[i].y) + (d*this.polygons[id2].points[i].y);
			points.push(new Point(x,y));
		}
		var polygon = new Polygon(points);
		polygon.annotation = this;
		polygon.level = z;
		return polygon; // TODO: Same needs to be done for subtractions
	}
	
	// Draw polygon at current level
	this.draw = function() {
		var poly;
		if(poly = this.getZPolygon($['mapsettings'].level)) poly.draw();
	}
	
	this.setLevel = function(z) { this.polygons[this.selected].setLevel(parseInt(z)); }
	
	this.setTopLevel = function(z) { this.polygons[this.selected].setLevel(z); this.range.top = z; }
	this.setBottomLevel = function(z) { this.polygons[this.selected].setLevel(z); this.range.bottom = z; }
	
	// Add point to currently selected polygon
	// TODO: needs to add points to all polygons at end.
	this.addPoint = function(point) {
		this.dirty = true;
		if($['mapsettings'].level == this.polygons[this.selected].level)
			return this.polygons[this.selected].addPoint(point);
		else if(this.polygons[this.selected].level == -1)	{
			this.polygons[this.selected].level = $['mapsettings'].level;
			return this.polygons[this.selected].addPoint(point);
		}
	}
	
	// Moves the point in the currently selected polygon
	this.movePoint = function(id, point) {
		this.dirty = true;
		if(this.polygons[this.selected].level == $['mapsettings'].level)
			return this.polygons[this.selected].movePoint(id,point);
		else {
			this.addZPolygon();
			return this.polygons[this.selected].movePoint(id,point);
		}
	}
  
	// Moves the currently selected point in polygon
	this.moveSelected = function(point) {
		this.dirty = true;
		if(this.polygons[this.selected].level == parseInt($['mapsettings'].level))
			return this.polygons[this.selected].moveSelected(point);
		else {
			this.addZPolygon();
			this.polygons[this.selected].level = parseInt($['mapsettings'].level);
			return this.polygons[this.selected].moveSelected(point);
		}
	}
  
	this.getPoint = function(id) {
		return this.polygons[this.selected].getPoint(id);
	}
  
	this.getPoints = function() {
		return this.polygons[this.selected].getPoints();
	}
  
	this.removePoint = function(id) {			
		return this.polygons[this.selected].removePoint(id);
	}
  
	this.removeSelectedPoint = function() {
		return this.polygons[this.selected].removeSelectedPoint();
	}
  
	// Determines whether a point on the map is a point in the currently selected polygon
	this.isPoint = function(point) {
		if(this.selected == -1) return -1;
		if(this.interpolated)
			return this.tempPolygon.isPoint(point);
		else
			return this.polygons[this.selected].isPoint(point);
	}
  
	// Select a point in the currently selected polygon
	this.selectPoint = function(id) {
		if(this.interpolated)
			this.tempPolygon.selectPoint(id);
		return this.polygons[this.selected].selectPoint(id);
	}
	  
	this.length = function() { return this.polygons[this.selected].length(); }
	
	// Stores the distances of current point to two neighbor points
	this.storeDistancesTo = function(point) { return this.polygons[this.selected].storeDistancesTo(point); }
	// Retuns the id of the closest neighbor
	this.closestToNeighbor = function(point) { return this.polygons[this.selected].closestToNeighbor(point); }
	// Adds a point next to selected point
	this.addNextTo = function(point,id) { this.dirty = true; return this.polygons[this.selected].addNextTo(point,id); }
	// Distance from inputed point to selected point
	this.selectedDistanceTo = function(point) { return this.polygons[this.selected].selectedDistanceTo(point); }
	// Gets the point that the given point is moving towards
	this.movingClosestToNeighbor = function(point) { return this.polygons[this.selected].movingClosestToNeighbor(point); }
	
	// Reset the ids in polygons array to correct values
	this.resetIds = function() {
		$.each(this.polygons, function(i, item){
			item.id = i;
		});
	}
	
	// Outputs annotation data for polygons
	this.serialize = function() {
		var data = {};
		if(this.db_id != -1)
			data['data[Zpolygon][id]'] = this.db_id;
		if(this.annotation_id != -1)
			data['data[Annotation][id]'] = this.annotation_id;
		data['data[Annotation][name]'] = this.name;
		data['data[Annotation][dataset_id]'] = $['mapsettings'].dataset_id;
		data['data[Annotation][type]'] = 0;
		data['data[Zpolygon][range_top]'] = this.range.top;
		data['data[Zpolygon][range_bottom]'] = this.range.bottom;
		data['data[Zpolygon][color]'] = this.color.r + ':' + this.color.g + ':' + this.color.b;
		$.each(this.polygons, function(i, item) {
			jQuery.extend(data, item.serialize(i)); 
		});
		return data;
	}
}

Polygons.prototype = new Annotation;

function Polylines(name, polyline, index) {
	this.polylines = new Array();
	this.tempPolyline;
	if(polyline) { this.polylines.push(polyline) };
	this.description = "";
	this.selected = -1;
	this.active = true;
	this.interpolated = false;
	this.className = 'Polyline';
	this.color = {"r":255,"g":0,"b":0,"t":.3 };
	this.db_id = -1; // If stored not stored in database id = -1, else it is the primary key of the zPolygons in the DB 
	this.annotation_id = -1; // Primary key of Annotation in the database if annotation is stored in database
	this.range = { "top":-1, "bottom":-1 } 	// -1 means unbounded, the annotation will extend to the layers past the layer
											// if unbounded in direction. Numbers refer to the bounding layers if bounded.
	
	
	if(name)
		this.name = name;
	
	if(index)
		this.index = index;
	
	this.clean = function() { this.dirty = false; }	
	
	// Polylines don't have subtraction points so always return false
	this.isSubtract = function() { return false; }	
	
	// Add new copy polyline to polylines array at given leve.
	this.addZPolyline = function() {
		var polyline = new Polyline();
		if(this.interpolated)
			var from = this.tempPolyline;
		else
			var from = this.polylines[this.selected];
		polyline.points = from.points.slice();
		polyline.selected = from.selected;
		this.addPolyline(polyline);
	}
	
	// Add Polyline to array
	this.addPolyline = function(polyline) {
		polyline.annotation = this;
		polyline.index = this.polylines.length;
		this.polylines.push(polyline);
		this.selected = this.polylines.length-1;
		return this.selected;
	}
	
	// Removes polyline
	this.removePolyline = function(id) {
		this.polyline = this.polylines.slice(0,id).concat( this.polylines.slice(id+1) );
		this.resetIds();
		if(this.selected > (this.length()-1)) this.selected--;
		this.draw();
	}
	
	// Returns true is annotation is valid for given z level
	this.inRange = function(level) {
		if(this.range.top == -1 && this.range.bottom == -1) return true;
		if(this.range.bottom>=level && this.range.top==-1) return true;
		if(this.range.top<=level && this.range.bottom==-1) return true;
		if(this.range.top<=level && this.range.bottom>=level) return true;
		return false;
	}
	
	// Gets the polyline needed for current level
	this.getZPolyline = function(z) {
		if(!this.inRange(z)) return false;
		var polyline;
		var interpolation = this.interpolated = false;
		var before = -1; var after = -1;
		// Get copy of polygons array that is sorted by level, ascending order;
		var polylines = this.polylines.slice().sort(function(a,b){ return parseInt(a.level)-parseInt(b.level); });
		$.each(polylines, function(i,item){
			if(item.level==z) { 
				polyline = item; interpolation = false; 
			} else if(z>item.level) { 
				interpolation = true; before = i; 
			}
		});
		if(interpolation) {
			if(typeof(polylines[(before+1)]) != 'undefined') {
				polyline = this.tempPolyline = this.interpolate($['mapsettings'].level, polylines[before].index, polylines[before+1].index);
				polyline.index = polylines[before].index;
				polyline.selected = polylines[before].selected;
				this.selected = polylines[before].index;
				this.interpolated = true;
			} else {
				polyline = polylines[before];
			}
		} else
			this.selected = polyline.index;
		return polyline;
	}
	
	// Returns interpolated polyline from two polylines given z level and ids of two polylines
	this.interpolate = function(z, id1, id2) {
		if(this.tempPolyline && this.tempPolyline.level == z) return this.tempPolygon;
		// d=distance as percentage of z level from top polyline to bottom polyline
		var d = Math.abs(z-this.polylines[id1].level)/Math.abs(this.polylines[id1].level-this.polylines[id2].level);
		var points = new Array();
		for(var i=0;i<this.polylines[id2].points.length;i++) {
			var x = ((1-d)*this.polylines[id1].points[i].x) + (d*this.polylines[id2].points[i].x);
			var y = ((1-d)*this.polylines[id1].points[i].y) + (d*this.polylines[id2].points[i].y);
			points.push(new Point(x,y));
		}
		var polyline = new Polyline(points);
		polyline.annotation = this;
		return polyline;
	}
	
	// Draws polygon at current level
	this.draw = function() {
		var poly;
		if(poly = this.getZPolyline($['mapsettings'].level)) poly.draw();
	}
	
	this.setLevel = function(z) { this.polylines[this.selected].setLevel(parseInt(z)); }
	
	this.setTopLevel = function(z) { this.polylines[this.selected].setLevel(z); this.range.top = z; }
	this.setBottomLevel = function(z) { this.polylines[this.selected].setLevel(z); this.range.bottom = z; }
	
	// Adds point to current level
	this.addPoint = function(point) {
		if($['mapsettings'].level == this.polylines[this.selected].level)
			return this.polylines[this.selected].addPoint(point);
		else if(this.polylines[this.selected].level == -1)	{
			this.polylines[this.selected].level = $['mapsettings'].level;
			this.polylines[this.selected].addPoint(point);
		}
	}
	
	// Moves given point
	this.movePoint = function(id, point) {
		if(this.polylines[this.selected].level == $['mapsettings'].level)
			return this.polylines[this.selected].movePoint(id,point);
		else {
			this.addZPolyline();
			return this.polylines[this.selected].movePoint(id,point);
		}
	}
  
	// Moves currently selected point
	this.moveSelected = function(point) {
		if(this.polylines[this.selected].level == parseInt($['mapsettings'].level))
			return this.polylines[this.selected].moveSelected(point);
		else {
			this.addZPolyline();
			this.polylines[this.selected].level = parseInt($['mapsettings'].level);
			return this.polylines[this.selected].movePoint(id,point);
		}
	}
  
	this.getPoint = function(id) {
		return this.polylines[this.selected].getPoint(id);
	}
  
	this.getPoints = function() {
		return this.polylines[this.selected].getPoints();
	}
 
	this.removePoint = function(id) {			
		return this.polylines[this.selected].removePoint(id);
	}
  
	this.removeSelectedPoint = function() {
		return this.polylines[this.selected].removeSelectedPoint();
	}
  
	this.isPoint = function(point) {
		if(this.selected == -1) return -1;
		if(this.interpolated)
			return this.tempPolyline.isPoint(point);
		else
			return this.polylines[this.selected].isPoint(point);
	}
  
	this.selectPoint = function(id) {
		if(this.interpolated)
			this.tempPolyline.selectPoint(id);
		return this.polylines[this.selected].selectPoint(id);
	}
	  
	this.length = function() { return this.polylines[this.selected].length(); }
		
	this.storeDistancesTo = function(point) { return this.polylines[this.selected].storeDistancesTo(point); }
	
	this.closestToNeighbor = function(point) { return this.polylines[this.selected].closestToNeighbor(point); }
	this.addNextTo = function(point,id) { return this.polylines[this.selected].addNextTo(point,id); }
	this.selectedDistanceTo = function(point) { return this.polylines[this.selected].selectedDistanceTo(point); }

	this.movingClosestToNeighbor = function(point) { return this.polylines[this.selected].movingClosestToNeighbor(point); }
	
	this.resetIds = function() {
		$.each(this.polylines, function(i, item){
			item.id = i;
		});
	}
	
	this.serialize = function() {
		var data = {};
		if(this.db_id != -1)
			data['data[Zpolyline][id]'] = this.db_id;
		if(this.annotation_id != -1)
			data['data[Annotation][id]'] = this.annotation_id;
		data['data[Annotation][name]'] = this.name;
		data['data[Annotation][dataset_id]'] = $['mapsettings'].dataset_id;
		data['data[Annotation][type]'] = 1;
		data['data[Zpolyline][range_top]'] = this.range.top;
		data['data[Zpolyline][range_bottom]'] = this.range.bottom;
		data['data[Zpolyline][color]'] = this.color.r + ':' + this.color.g + ':' + this.color.b;
		$.each(this.polylines, function(i, item) {
			jQuery.extend(data, item.serialize(i)); 
		});
		return data;
	}
}

Polylines.prototype = new Annotation;

// Superclass polygon and polyline classes
function PointBased(index) {
	this.color = {"r":255,"g":0,"b":0,"t":.3 };
	
	this.selected = -1;
	this.subtractSel = -1;
	
	this.addPoint = function(point) {
		if(this.annotation && this.annotation.isSubtract()) {
			this.subtractSel = this.subtractions.length;
			this.subtractions.push(point);
			return this.subtractSel;
		} else {
			this.selected = this.points.length;
			this.points.push(point);
			return this.selected;
		}
	}
	
	this.setLevel = function(z) { this.level = parseInt(z); }
	
	this.activate = function() { this.active = true; }
	this.deactivate = function() { this.active = false; }
	this.isactive = function() { return this.active; }
			
	this.movePoint = function(id, point) {
		if(this.annotation && this.annotation.isSubtract()) this.subtractions[id] = point;
	 	else this.points[id] = point;
	}
	
	this.moveSelected = function(point) {
		if(this.annotation && this.annotation.isSubtract()) this.movePoint(this.subtractSel,point);
		else this.movePoint(this.selected,point);
	}
	
	this.getPoint = function(id) {
		if(this.annotation && this.annotation.isSubtract()) this.subtractions[id];
		else return this.points[id];
	}
	
	// Returns a array containing a line function between point1 and point2 
	this.getLineFunction = function(point1, point2) {
		if(this.annotation && this.annotation.isSubtract()) var points = this.subtractions;
		else var points = this.points;
		if((points[point2].x != points[point1].x)) {
			var m = (points[point2].y - points[point1].y)/(points[point2].x - points[point1].x);
			var b = points[point2].y - m*(points[point2].x);
			return [ (m>0), function(x) { return (m*x)+b; } ];
		} else points[point2].x;
	}

	this.getPoints = function() {
		return this.points;
	}
	
	// Returns an array containing the four corners of a bounding box around annotation
	this.getBounds = function() {
		if(this.points.length == 0) return false;
		// Gets two sorted array of point by x point and y point
		var xsorted = this.points.slice().sort(function(a,b) { return a.x-b.x; });
		var ysorted = this.points.slice().sort(function(a,b) { return a.y-b.y; });
 		var bounds = new Array(	new Point(xsorted[0].x, ysorted[0].y), 
								new Point(xsorted[xsorted.length-1].x, ysorted[0].y),
								new Point(xsorted[xsorted.length-1].x, ysorted[ysorted.length-1].y),
								new Point(xsorted[0].x, ysorted[ysorted.length-1].y) );
		return bounds;
	}
	
	// Draws black bounding box around annotation
	this.drawBoundingBox = function() {
		var points = this.getBounds();
		var ctx = this.annotation.parent.ctx;
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		$.each(points, function(i,item) {
			if(i>0)
				ctx.lineTo(item.x, item.y);
		});
		ctx.lineTo(points[0].x, points[0].y);
		ctx.strokeStyle = "#000000";
		ctx.stroke();
		ctx.closePath();	
		ctx.moveTo(-this.points[0].x, -this.points[0].y);	
	}
	
	// Returns width of the annotation
	this.getWidth = function() {
		var bounds = this.getBounds();
		if(this.points.length <2) return 0;
		return xbounds[1].x - bounds[0].x;
	}
	
	// Returns height of the annotation
	this.getHeight = function() {
		var bounds = this.getBounds();
		if(this.points.length <2) return 0;
		return bounds[2].y - bounds[0].y;
	}
	
	// Gets the topleft corner of the annotation
	this.getXYPosition = function() {
		var bounds = this.getBounds();
		if(this.points.length <1) return false;
		return bounds[0];
	}
	

	this.getSubtractionPoints = function() {
		if(!this.subtractions) return false;
		return this.subtractions;
	}
	
	this.removePoint = function(id) {			
		if(this.annotation && this.annotation.isSubtract()) this.subtractions = this.subtractions.slice(0,id).concat( this.subtractions.slice(id+1) );
		else this.points = this.points.slice(0,id).concat( this.points.slice(id+1) );
	}
	
	this.removeSelectedPoint = function() {
		if(this.annotation && this.annotation.isSubtract())
			this.removePoint(this.subtractSel);
		else 
			this.removePoint(this.selected);
		this.deselect();
	}
	
	this.isPoint = function(point) {
		if(this.annotation && this.annotation.isSubtract()) var points = this.subtractions;
		else var points = this.points;
		id = -1;
		$.each(points, function(i,item) {
			if(Math.abs(point.x - item.x) < (5/($['mapsettings'].scale.x)) && Math.abs(point.y - item.y) < (5/$['mapsettings'].scale.x)) id = i;
		});
		return id;
	}
	
	this.selectPoint = function(id) {
		if(this.annotation && this.annotation.isSubtract()) this.subtractSel = id;
		else this.selected = id;
	}
	
	this.deselect = function() { this.selected = -1;  this.subtractSel = -1; }
			
	this.drawSubtractionControlPoints = function() {
	 	var ctx = this.annotation.parent.ctx;
		var selected = this.subtractSel;
		$.each(this.subtractions, function(i,item) {
			ctx.fillStyle = "rgba(0,0,0,1)";
			ctx.strokeStyle = "rgba(0,0,0,1)";
			ctx.beginPath();
			var radius = 3/$['mapsettings'].scale.x;
			ctx.lineWidth = 1/$['mapsettings'].scale.x;
			ctx.arc(item.x-(radius/2),item.y-(radius/2), radius, 0, Math.PI*2,true);
			if(i==selected) ctx.fill();
			else ctx.stroke();
			ctx.closePath();	
		});
	}
	
	this.length = function() { return this.points.length; }
	
	// Returns the distance between two points
	this.pointDistances = function(id1, id2) {
		if(this.annotation.isSubtract()) var points = this.subtractions;
		else var points = this.points;
		// Distance is Square Root of (x1-x2)^2+(y1-y2)^2
		return Math.sqrt(Math.pow(points[id1].x-points[id2].x,2)+Math.pow(points[id1].y-points[id2].y,2));
	}
	
	// Stores the distances from a point to neighbors of currently selected point
	this.storeDistancesTo = function(point) {
		if(this.annotation && this.annotation.isSubtract()) {
			if(this.subtractions.length < 2) { return -1; } // need at least two points
			else if(this.subtractions.length == 2) return (this.subtractSel+1)%2; // If two points return other point
			else
				this.distances = this.getDistancesTo(point);
		} else {
			if(this.points.length < 2) { return -1; }
			else if(this.points.length == 2) return (this.selected+1)%2;
			else
				this.distances = this.getDistancesTo(point);
		}
	}
	
	// Returns the distances from a point to neighbors of currently selected point 
	this.getDistancesTo = function(point) {
		if(this.annotation && this.annotation.isSubtract()) {
			var neigh1 = this.subtractSel-1;
			var neigh2 = (this.subtractSel+1)%(this.subtractions.length);
			if(neigh1<0) neigh1 = this.subtractions.length-1;
		} else {
			var neigh1 = this.selected-1;
			var neigh2 = (this.selected+1)%(this.points.length);
			if(neigh1<0) neigh1 = this.points.length-1;
		}
		var dis1 = this.pointDistancesToPoint(point, neigh1);
		var dis2 = this.pointDistancesToPoint(point, neigh2);
		return [dis1, dis2];
	}
	
	this.pointDistancesToPoint = function(point, id) {
		if(this.annotation && this.annotation.isSubtract()) var points = this.subtractions;
		else var points = this.points;
		return Math.sqrt(Math.pow(point.x-points[id].x,2)+Math.pow(point.y-points[id].y,2));
	}
	
	this.selectedDistanceTo = function(point) {
		return this.pointDistancesToPoint(point, this.selected);
	}
	 
	// Returns the index of the point that the given point is closer to
	this.closerTo = function(point, id1, id2) {
		var dis1 = this.pointDistancesToPoint(point, id1);
		var dis2 = this.pointDistancesToPoint(point, id2);
		if(dis1>=dis2) return id1;
		else return id2;
	}
	
	// Returns which neighbor point to the currently selected point the given point is closest to
	this.closestToNeighbor = function(point) {
		if(this.points.length < 2) { return -1; }
		else if(this.points.length == 2) return (this.selected+1)%2;
		else {
			var neigh1 = this.selected-1;
			var neigh2 = (this.selected+1)%(this.points.length);
			if(neigh1<0) neigh1 = this.points.length-1;
			return this.closerTo(point, neigh1, neigh2);
		}
	}
	
	// Returns which neighbor to the selected point is closest to given point
	// Used with storeDistancesTo() beforehand to get initial location.
	this.movingClosestToNeighbor = function(point) {
		if(this.annotation && this.annotation.isSubtract()) {
			var dist = this.getDistancesTo(point);
			var neigh1 = this.subtractSel-1;
			var neigh2 = (this.subtractSel+1)%(this.subtractions.length);
			if(neigh1<0) neigh1 = this.subtractions.length-1;
		} else {
			var dist = this.getDistancesTo(point);
			var neigh1 = this.selected-1;
			var neigh2 = (this.selected+1)%(this.points.length);
			if(neigh1<0) neigh1 = this.points.length-1;
		}
		if( Math.abs(dist[0]-this.distances[0]) >= Math.abs(dist[1]-this.distances[1]))
			return neigh1;
		else return neigh2;
	}
	
	// Adds point next to a given index
	this.addNextTo = function(point,id) {
		if(this.annotation && this.annotation.isSubtract()) {
			if(this.subtractSel == (this.subtractions.length-1) && id == 0) id = 0;
			else if(this.subtractSel == 0 && (id == this.points.length-1)) id = 0;
			else if(id<this.subtractSel && this.subtractSel>0) id = this.subtractSel;
			if(id>0)
				this.subtractions = this.subtractions.slice(0,id).concat( [point].concat(this.subtractions.slice(id)) );
			else
				this.subtractions = [point].concat(this.subtractions);
			this.subtractSel = id;
		} else {
			if(this.selected == (this.points.length-1) && id == 0) id = 0;
			else if(this.selected == 0 && (id == this.points.length-1)) id = 0;
			else if(id<this.selected && this.selected>0) id = this.selected;
			if(id>0)
				this.points = this.points.slice(0,id).concat( [point].concat(this.points.slice(id)) );
			else
				this.points = [point].concat(this.points);
			this.selected = id;
		}
	}
	
}

function Polygon(points) {
	this.points = new Array();
	if(points) this.points = points;
	this.subtractions = new Array();
	this.color = {"r":255,"g":0,"b":0,"t":.3 };
	this.active = true;
	this.level = -1;
	this.db_id = -1; // If polygon is not stored in the database it db_id = -1, else db_id is the value polygon Primary Key
	
	this.inRange = function(level) {
		if(this.annotation.range.top == -1 && this.annotation.range.bottom == -1) return true;
		if(this.annotation.range.bottom>=level && this.annotation.range.top==-1) return true;
		if(this.annotation.range.top<=level && this.annotation.range.bottom==-1) return true;
		if(this.annotation.range.top<=level && this.annotation.range.bottom>=level) return true;
		return false;
	}
	
	this.draw = function() {
	 	var ctx = this.annotation.parent.ctx;
		if(!this.active || !this.annotation.active || !(this.points[0]) || !this.inRange($['mapsettings'].level)) return false;
				
		ctx.beginPath();
		ctx.moveTo(this.points[0].x, this.points[0].y);
		$.each(this.points, function(i,item) {
			if(i>0)
				ctx.lineTo(item.x, item.y);
		});
		if(this.subtractions.length > 0) {
			ctx.lineTo(this.points[0].x,this.points[0].y);
			for(var i=this.subtractions.length-1; i>-1; i--)
				ctx.lineTo(this.subtractions[i].x, this.subtractions[i].y);
			ctx.lineTo(this.subtractions[this.subtractions.length-1].x,this.subtractions[this.subtractions.length-1].y);
			ctx.lineTo(this.points[0].x,this.points[0].y);
		}
		ctx.fillStyle = this.annotation.getColor();
		ctx.fill();
		ctx.closePath();	
		ctx.moveTo(-this.points[0].x, -this.points[0].y);	
		
		if(this.annotation.selected == this.index && this.annotation.isSelected()) {
			if(this.annotation.isSubtract())
				this.drawSubtractionControlPoints();
			else
				this.drawControlPoints();
		}
				
	}
	this.drawControlPoints = function() {
	 	var ctx = this.annotation.parent.ctx;
		var selected = this.selected;
		$.each(this.points, function(i,item) {
			ctx.fillStyle = "rgba(0,0,0,1)";
			ctx.strokeStyle = "rgba(0,0,0,1)";
			ctx.beginPath();
			var radius = 3/$['mapsettings'].scale.x;
			ctx.lineWidth = 1/$['mapsettings'].scale.x;
			ctx.arc(item.x-(radius/2),item.y-(radius/2), radius, 0, Math.PI*2,true);
			if(i==selected) ctx.fill();
			else ctx.stroke();
			ctx.closePath();	
		});
	}
	
	this.serialize = function(index) {
		var data = {};
		if(this.db_id != -1)
			data['data[Polygons]['+index+'][Polygon][id]'] = this.db_id;
		data['data[Polygons]['+index+'][Polygon][level]'] = this.level;
		jQuery.each(this.points, function(i, item) {
			data['data[PolygonPoints]['+index+']['+i+'][PolygonPoint][x]'] = item.x;
			data['data[PolygonPoints]['+index+']['+i+'][PolygonPoint][y]'] = item.y;
		});
		return data;
	}
	
}

Polygon.prototype = new PointBased;

function Polyline(points) {
	this.className = 'Polyline';
	this.points = new Array();
	if(points)
		this.points = points;
	this.active = true;
	this.level = -1;
	
	
	this.draw = function() {
	 	var ctx = this.annotation.parent.ctx;
		if(!this.active || !(this.points[0])) return false;
					
		ctx.beginPath();
		ctx.lineWidth = (1/($['mapsettings'].scale.x))*2;
		ctx.moveTo(this.points[0].x, this.points[0].y);
		$.each(this.points, function(i,item) {
			if(i>0)
				ctx.lineTo(item.x, item.y);
		});
		
		ctx.strokeStyle = this.annotation.getColor();
		ctx.stroke();
		ctx.closePath();	
		ctx.moveTo(-this.points[0].x, -this.points[0].y);	
		
		if(this.annotation.selected == this.index && this.annotation.isSelected()) {
				this.drawControlPoints();
		}
		
		//this.drawBoundingBox();
		
	}
	this.drawControlPoints = function() {
	 	var ctx = this.annotation.parent.ctx;
		var selected = this.selected;
		$.each(this.points, function(i,item) {
			ctx.fillStyle = "rgba(0,0,0,1)";
			ctx.strokeStyle = "rgba(0,0,0,1)";
			ctx.beginPath();
			var radius = 3/$['mapsettings'].scale.x;
			ctx.lineWidth = (1/($['mapsettings'].scale.x));
			ctx.arc(item.x-(radius/2),item.y-(radius/2), radius, 0, Math.PI*2,true);
			if(i==selected) ctx.fill();
			else ctx.stroke();
			ctx.closePath();	
		});
	}
	
	this.serialize = function(index) {
		var data = {};
		if(this.db_id != -1)
			data['data[Polylines]['+index+'][Polyline][id]'] = this.db_id;
		data['data[Polylines]['+index+'][Polyline][level]'] = this.level;
		jQuery.each(this.points, function(i, item) {
			data['data[PolylinePoints]['+index+']['+i+'][PolylinePoint][x]'] = item.x;
			data['data[PolylinePoints]['+index+']['+i+'][PolylinePoint][y]'] = item.y;
		});
		return data;
	}
}
Polyline.prototype = new PointBased;