// ============================================================================
// SYSTEM HANDLERS - GET_FILE_INFO, RELOAD_UI
// ============================================================================

export var systemHandlers: Record<string, (msg: any) => Promise<void>> = {
  GET_FILE_INFO: async function (msg) {
    try {
      figma.ui.postMessage({ type: 'GET_FILE_INFO_RESULT', requestId: msg.requestId, success: true, fileInfo: { fileName: figma.root.name, fileKey: figma.fileKey || null, currentPage: figma.currentPage.name } });
    } catch (error: any) {
      var errorMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({ type: 'GET_FILE_INFO_RESULT', requestId: msg.requestId, success: false, error: errorMsg });
    }
  },
  RELOAD_UI: async function (msg) {
    try {
      console.log('\uD83C\uDF09 [Desktop Bridge] Reloading plugin UI');
      figma.ui.postMessage({ type: 'RELOAD_UI_RESULT', requestId: msg.requestId, success: true });
      setTimeout(function () { figma.showUI(__html__, { width: 320, height: 320, visible: true, themeColors: true }); }, 100);
    } catch (error: any) {
      var errorMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({ type: 'RELOAD_UI_RESULT', requestId: msg.requestId, success: false, error: errorMsg });
    }
  },
};
