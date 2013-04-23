/**
 * Map and map layers library - maplayers.js
 */

/* Extend existing OpenLayers.Map and OpenLayers.Layer objects */

// Flask host
OpenLayers.Map.prototype.host = "";

OpenLayers.Map.prototype.pywcsLocation = '/alphaservice/wcs2json/wcs?';
OpenLayers.Map.prototype.pywfsLocation = '/alphaservice/wfs2json/wfs?';

// Not all browsers have webGL
OpenLayers.Map.prototype.cesiumLoaded = null;

// A list of layer names that will be selected by default
OpenLayers.Map.prototype.sampleLayers = ["no3", "chl", "v_wind", "CRW_SST" ];

// Array of ALL available date-times for all date-time layers where data's available
// The array is populated once all the date-time layers have loaded
OpenLayers.Map.prototype.enabledDays = [];

// Stores the data provided by the master cache file on the server. This includes
// layer names, titles, abstracts, etc.
OpenLayers.Map.prototype.getCapabilities = [];

// Used as offsets when sorting layers in groups
OpenLayers.Map.prototype.numBaseLayers = 0;
OpenLayers.Map.prototype.numRefLayers = 0;
OpenLayers.Map.prototype.numOpLayers = 0;

// Stores messages to be used by the gritter
OpenLayers.Map.prototype.helperMessages = [];

// Temporary version of microLayer and layer storage.
OpenLayers.Map.prototype.microLayers = [];
OpenLayers.Map.prototype.layerStore = [];

// Store the type of the last drawn ROI within the map object ('', 'point', 'box', 'circle' or 'poly')
OpenLayers.Map.prototype.ROI_Type = '';

// Layer Name with /
OpenLayers.Layer.prototype.urlName = '';

// Layer title
OpenLayers.Layer.prototype.displayTitle = '';
OpenLayers.Layer.prototype.title = '';

// Layer abstract
OpenLayers.Layer.prototype.productAbstract = '';

// Layer sensor
OpenLayers.Layer.prototype.displaySensorName = '';
OpenLayers.Layer.prototype.sensorName = '';


// Date Range
OpenLayers.Layer.prototype.firstDate = '';
OpenLayers.Layer.prototype.lastDate = '';

// The min and max scale range, used by the scalebar
OpenLayers.Layer.prototype.maxScaleVal = null;
OpenLayers.Layer.prototype.origMaxScaleVal = null;
OpenLayers.Layer.prototype.minScaleVal = null;
OpenLayers.Layer.prototype.origMinScaleVal = null;
OpenLayers.Layer.prototype.log = false;

// Add a new property to the OpenLayers layer object to tell the UI which <ul>
// control ID in the layers panel to assign it to - defaults to operational layer
OpenLayers.Layer.prototype.controlID = 'opLayers';

// Set this to true of the layer is a temporal layer with date-time based data
OpenLayers.Layer.prototype.temporal = false;

// Set this to true if the layer has an elevation component
OpenLayers.Layer.prototype.elevation = false;

// Elevation default
OpenLayers.Layer.prototype.elevationDefault = null;

OpenLayers.Layer.prototype.elevationUnits = null;

// A list of styles available for the layer
OpenLayers.Layer.prototype.styles = [];

// The EX_GeographicBoundingBox for the layer
OpenLayers.Layer.prototype.exBoundingBox = [];

// The BoundingBox for the layer
OpenLayers.Layer.prototype.boundingBox = [];

// Holds cached date-times as array of ISO8601 strings for each layer based on data availability
OpenLayers.Layer.prototype.DTCache = [];

OpenLayers.Layer.prototype.WFSDatesToIDs = {};

// Holds cached elevation numbers as an array
OpenLayers.Layer.prototype.elevationCache = [];

// Holds an array of the current date-times for the current date and layer as an array of ISO8601 strings
OpenLayers.Layer.prototype.currentDateTimes = [];

// Currently selected date-time for the current date and layer as an ISO8601 string
OpenLayers.Layer.prototype.selectedDateTime = '';

// Is the layer selected for display in the GUI or not
OpenLayers.Layer.prototype.selected = false;

// Used to store the cesium layer
OpenLayers.Layer.prototype.globeLayer = null;

/**
 * Function which looks for a date within a layer. The date 
 * passed is in the format yyyy-mm-dd or is an empty string. 
 * Returns the array of date-times if there's a match or null
 * if not.
 * 
 * @memberOf external:OpenLayers.Map.matchDate
 */
OpenLayers.Layer.prototype.matchDate = function (thedate) {
   var thelayer = this;
   var filtArray = $.grep(thelayer.DTCache, function(dt, i) {
      var datePart = dt.substring(0, 10);
      return (datePart == thedate);
   });
   if (filtArray.length>0){
      return filtArray;
   }
   else{
      return null;
   }
};

/**
 * Select the given temporal layer on the Map based on JavaScript date input
 * 
 * @param {Object} layer - The OpenLayers.Layer object to select
 * @param {Date} thedate - The currently selected view data as a JavaScript Date object
 *
 */
OpenLayers.Map.prototype.selectDateTimeLayer = function(layer, thedate) {
   if(thedate) {
      var uidate = opec.utils.ISODateString(thedate);
      var mDate = layer.matchDate(uidate);
      if(mDate) {
         layer.currentDateTimes = mDate;
         // Choose 1st date in the matched date-times for the moment - will expand functionality later
         layer.selectedDateTime = mDate[0];
         
         if(layer.controlID == 'opLayers')
            layer.mergeNewParams({time: layer.selectedDateTime});
         else {    
            layer.removeAllFeatures();      
            opec.getFeature(layer, layer.selectedDateTime);
         }
         
         layer.setVisibility(layer.selected);
         console.info('Layer ' + layer.name + ' data available for date-time ' + layer.selectedDateTime + '. Layer selection and display: ' + layer.selected);
      }
      else{
         layer.currentDateTimes = [];
         layer.selectedDateTime = '';
         layer.setVisibility(false);
         console.info('Layer ' + layer.name + ' no data available for date-time ' + uidate + '. Not displaying layer.');
      }
   }
   opec.checkLayerState(layer);
};

/**
 * Map function to filter layers with date-time dependencies to given date
 * Used as the onselect callback function for the jQuery UI current view date DatePicker control
 * 
 * @param {string} dateText - yyyy-mm-dd format date string to filter to
 * @param {Object} inst - The instance of the jQuery UI DatePicker view date control
 *
 */
OpenLayers.Map.prototype.filterLayersByDate = function(date) {
   var themap = this;
   $.each(themap.layers, function(index, value) {
      var layer = value;
      // Only filter date-dependent layers
      if (layer.temporal){
         themap.selectDateTimeLayer(value, date);
      }
   });      
};

/**
 * Map function to re-generate the global date cache for selected layers
 * 
 */
OpenLayers.Map.prototype.refreshDateCache = function() {
   var map = this;
   map.enabledDays = [];
   
   $.each(map.layers, function(index, value) {
      var layer = value;
      if(layer.selected && layer.temporal) {
         map.enabledDays = map.enabledDays.concat(layer.DTCache);
      }
   });
   
   map.enabledDays = opec.utils.arrayDeDupe(map.enabledDays);
   
   // Re-filter the layers by date now the date cache has changed
   // DEBUG
   console.info('Global date cache now has ' + map.enabledDays.length + ' members.');
};

/**
 * Map function which returns availability (boolean) of data for the given JavaScript date for all layers.
 * Used as the beforeshowday callback function for the jQuery UI current view date DatePicker control
 * 
 * @param {Date} thedate - The date provided by the jQuery UI DatePicker control as a JavaScript Date object
 * @return {Array.<boolean>} Returns true or false depending on if there is layer data available for the given date
 */
OpenLayers.Map.prototype.allowedDays = function(thedate) {
   var themap = this;
   var uidate = opec.utils.ISODateString(thedate);
   // Filter the datetime array to see if it matches the date using jQuery grep utility
   var filtArray = $.grep(themap.enabledDays, function(dt, i) {
      var datePart = dt.substring(0, 10);
      return (datePart == uidate);
   });
   // If the filtered array has members it has matched this day one or more times
   if(filtArray.length > 0) {
      return [true];
   }
   else {
      return [false];
   }
};

/**
 * Map function which gets data layers asynchronously and creates operational layers for each one
 * 
 * @param {string} fileName - The file name for the specific JSON layer cache
 * @param {string} microLayer - The microLayer for the layer to be downloaded
 */
OpenLayers.Map.prototype.getLayerData = function(fileName, microLayer) {
   $.ajax({
      type: 'GET',
      url: "./cache/layers/" + fileName,
      dataType: 'json',
      asyc: true,
      cache: false,
      success: function(data) {
         opec.createOpLayer(data, microLayer);
         // DEBUG
         //console.log("Adding layer...");
         opec.addOpLayer(microLayer.name);
         // DEBUG
         //console.log("Added Layer");
      },
      error: function(request, errorType, exception) {
         var data = {
            type: 'layer cache',
            request: request,
            errorType: errorType,
            exception: exception,
            url: this.url
         };          
         gritterErrorHandler(data);
      }
   });
};

/**
 * Map function which gets layers metadata asynchronously and sets up the map scale min and max parameters
 * 
 * @param {Object} layer - The OpenLayers.Layer object
 * 
 */
OpenLayers.Map.prototype.getMetadata = function(layer) {
   $.ajax({
      type: 'GET',
      url: OpenLayers.ProxyHost + layer.url + encodeURIComponent('item=layerDetails&layerName=' + layer.urlName + '&request=GetMetadata'),
      dataType: 'json',
      asyc: true,
      success: function(data) {
         layer.origMinScaleVal = parseFloat(data.scaleRange[0]);
         layer.origMaxScaleVal = parseFloat(data.scaleRange[1]);
         layer.minScaleVal = layer.origMinScaleVal;
         layer.maxScaleVal = layer.origMaxScaleVal;
         
         layer.log = data.log == 'true' ? true : false;
      },
      error: function(request, errorType, exception) {
         layer.origMinScaleVal = 0;
         layer.origMaxScaleVal = 1;
         layer.minScaleVal = layer.origMinScaleVal;
         layer.maxScaleVal = layer.origMaxScaleVal;
         layer.log = false;
         
         var data = {
            type: 'layer MetaData',
            request: request,
            errorType: errorType,
            exception: exception,
            url: this.url
         };          
         gritterErrorHandler(data);
      }
   });
};