goog.provide('ol.renderer.Map');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dispose');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.functions');
goog.require('goog.object');
goog.require('goog.vec.Mat4');
goog.require('ol.FrameState');
goog.require('ol.layer.Layer');
goog.require('ol.renderer.Layer');



/**
 * @constructor
 * @extends {goog.Disposable}
 * @param {Element} container Container.
 * @param {ol.Map} map Map.
 */
ol.renderer.Map = function(container, map) {

  goog.base(this);

  /**
   * @private
   * @type {Element}
   */
  this.container_ = container;

  /**
   * @protected
   * @type {ol.Map}
   */
  this.map = map;

  /**
   * @protected
   * @type {Object.<number, ol.renderer.Layer>}
   */
  this.layerRenderers = {};

  /**
   * @private
   * @type {Object.<number, ?number>}
   */
  this.layerRendererChangeListenKeys_ = {};

};
goog.inherits(ol.renderer.Map, goog.Disposable);


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 */
ol.renderer.Map.prototype.addLayer = function(layer) {
  var layerRenderer = this.createLayerRenderer(layer);
  this.setLayerRenderer(layer, layerRenderer);
};


/**
 * @param {ol.FrameState} frameState FrameState.
 * @protected
 */
ol.renderer.Map.prototype.calculateMatrices2D = function(frameState) {

  var view2DState = frameState.view2DState;
  var coordinateToPixelMatrix = frameState.coordinateToPixelMatrix;

  goog.vec.Mat4.makeIdentity(coordinateToPixelMatrix);
  goog.vec.Mat4.translate(coordinateToPixelMatrix,
      frameState.size.width / 2,
      frameState.size.height / 2,
      0);
  goog.vec.Mat4.scale(coordinateToPixelMatrix,
      1 / view2DState.resolution,
      -1 / view2DState.resolution,
      1);
  goog.vec.Mat4.rotateZ(coordinateToPixelMatrix,
      -view2DState.rotation);
  goog.vec.Mat4.translate(coordinateToPixelMatrix,
      -view2DState.center[0],
      -view2DState.center[1],
      0);

  var inverted = goog.vec.Mat4.invert(
      coordinateToPixelMatrix, frameState.pixelToCoordinateMatrix);
  goog.asserts.assert(inverted);

};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 * @return {ol.renderer.Layer} layerRenderer Layer renderer.
 */
ol.renderer.Map.prototype.createLayerRenderer = function(layer) {
  return new ol.renderer.Layer(this, layer);
};


/**
 * @inheritDoc
 */
ol.renderer.Map.prototype.disposeInternal = function() {
  goog.object.forEach(this.layerRenderers, function(layerRenderer) {
    goog.dispose(layerRenderer);
  });
  goog.base(this, 'disposeInternal');
};


/**
 * @return {Element} Canvas.
 */
ol.renderer.Map.prototype.getCanvas = goog.functions.NULL;


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 * @return {ol.renderer.Layer} Layer renderer.
 */
ol.renderer.Map.prototype.getLayerRenderer = function(layer) {
  var layerKey = goog.getUid(layer);
  var layerRenderer = this.layerRenderers[layerKey];
  goog.asserts.assert(goog.isDef(layerRenderer));
  return layerRenderer;
};


/**
 * @param {Array.<ol.layer.Layer>} layers Array of layers.
 * @protected
 */
ol.renderer.Map.prototype.updateLayersRenderers = function(layers) {
  var i, layerKey;
  var layerKeys = goog.object.getKeys(this.layerRenderers);
  for (i = 0; i < layers.length; i++) {
    var layer = layers[i];
    layerKey = goog.getUid(layer);
    if (!goog.array.remove(layerKeys, layerKey)) {
      this.addLayer(layer);
    }
  }
  for (i = 0; i < layerKeys.length; i++) {
    layerKey = layerKeys[i];
    this.removeLayer(this.layerRenderers[layerKey].getLayer());  // FIXME
  }
};


/**
 * @return {ol.Map} Map.
 */
ol.renderer.Map.prototype.getMap = function() {
  return this.map;
};


/**
 * @param {goog.events.Event} event Event.
 * @protected
 */
ol.renderer.Map.prototype.handleLayerRendererChange = function(event) {
  this.getMap().render();
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @protected
 */
ol.renderer.Map.prototype.removeLayer = function(layer) {
  goog.dispose(this.removeLayerRenderer(layer));
};


/**
 * @param {ol.layer.Layer} layer Layer.
 * @return {ol.renderer.Layer} Layer renderer.
 * @protected
 */
ol.renderer.Map.prototype.removeLayerRenderer = function(layer) {
  var layerKey = goog.getUid(layer);
  if (layerKey in this.layerRenderers) {
    var layerRenderer = this.layerRenderers[layerKey];
    delete this.layerRenderers[layerKey];
    goog.events.unlistenByKey(this.layerRendererChangeListenKeys_[layerKey]);
    delete this.layerRendererChangeListenKeys_[layerKey];
    return layerRenderer;
  } else {
    return null;
  }
};


/**
 * Render.
 * @param {?ol.FrameState} frameState Frame state.
 */
ol.renderer.Map.prototype.renderFrame = goog.nullFunction;


/**
 * @param {ol.layer.Layer} layer Layer.
 * @param {ol.renderer.Layer} layerRenderer Layer renderer.
 * @protected
 */
ol.renderer.Map.prototype.setLayerRenderer = function(layer, layerRenderer) {
  var layerKey = goog.getUid(layer);
  goog.asserts.assert(!(layerKey in this.layerRenderers));
  this.layerRenderers[layerKey] = layerRenderer;
  goog.asserts.assert(!(layerKey in this.layerRendererChangeListenKeys_));
  this.layerRendererChangeListenKeys_[layerKey] = goog.events.listen(
      layerRenderer, goog.events.EventType.CHANGE,
      this.handleLayerRendererChange, false, this);
};
