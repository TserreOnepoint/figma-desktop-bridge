// ============================================================================
// CAPTURE_SCREENSHOT - Capture node screenshot using plugin exportAsync
// ============================================================================

export var screenshotHandlers: Record<string, (msg: any) => Promise<void>> = {
  CAPTURE_SCREENSHOT: async function (msg) {
    try {
      console.log('\uD83C\uDF09 [Desktop Bridge] Capturing screenshot for node:', msg.nodeId);
      var node = msg.nodeId ? await figma.getNodeByIdAsync(msg.nodeId) : figma.currentPage;
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('exportAsync' in node)) throw new Error('Node type ' + node.type + ' does not support export');
      var format = msg.format || 'PNG';
      var scale = msg.scale || 2;
      var exportSettings = { format: format, constraint: { type: 'SCALE', value: scale } };
      var bytes = await node.exportAsync(exportSettings);
      var base64 = figma.base64Encode(bytes);
      var bounds = null;
      if ('absoluteBoundingBox' in node) bounds = node.absoluteBoundingBox;
      console.log('\uD83C\uDF09 [Desktop Bridge] Screenshot captured:', bytes.length, 'bytes');
      figma.ui.postMessage({ type: 'CAPTURE_SCREENSHOT_RESULT', requestId: msg.requestId, success: true, image: { base64: base64, format: format, scale: scale, byteLength: bytes.length, node: { id: node.id, name: node.name, type: node.type }, bounds: bounds } });
    } catch (error: any) {
      var errorMsg = error && error.message ? error.message : String(error);
      console.error('\uD83C\uDF09 [Desktop Bridge] Screenshot capture error:', errorMsg);
      figma.ui.postMessage({ type: 'CAPTURE_SCREENSHOT_RESULT', requestId: msg.requestId, success: false, error: errorMsg });
    }
  },
};
