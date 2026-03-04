// ============================================================================
// SYSTEM HANDLERS - RESIZE, GET_FILE_INFO, RELOAD_UI
// ============================================================================

export var systemHandlers: Record<string, (msg: any) => Promise<void>> = {
  // ---- RESIZE ----
  RESIZE: async function (msg) {
    try {
      figma.ui.resize(msg.width || 320, msg.height || 80);
    } catch (error: any) {
      // Non-critical — ignore resize failures
    }
  },

  // ---- GET_FILE_INFO ----
  GET_FILE_INFO: async function (msg) {
    try {
      figma.ui.postMessage({
        type: 'GET_FILE_INFO_RESULT',
        requestId: msg.requestId,
        success: true,
        fileInfo: {
          fileName: figma.root.name,
          fileKey: figma.fileKey || null,
          currentPage: figma.currentPage.name,
        },
      });
    } catch (error: any) {
      var errorMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({
        type: 'GET_FILE_INFO_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg,
      });
    }
  },

  // ---- RELOAD_UI ----
  RELOAD_UI: async function (msg) {
    try {
      console.log('🌉 [Desktop Bridge] Reloading plugin UI');
      figma.ui.postMessage({
        type: 'RELOAD_UI_RESULT',
        requestId: msg.requestId,
        success: true,
      });
      // Short delay to let the response message be sent before reload
      setTimeout(function () {
        figma.showUI(__html__, { width: 320, height: 460, visible: true, themeColors: true });
      }, 100);
    } catch (error: any) {
      var errorMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({
        type: 'RELOAD_UI_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg,
      });
    }
  },
};
