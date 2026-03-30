// ============================================================================
// BRIDGE RELAY HANDLERS — Commands forwarded from the MCP Worker via Supabase.
// These handlers run in the QuickJS sandbox and respond via figma.ui.postMessage.
//
// ES2017 target: no ?. or ?? operators — use explicit checks.
// ============================================================================

import { editorInfo } from '../capabilities';

export var bridgeRelayHandlers: Record<string, (msg: any) => Promise<void>> = {

  // ---- PING ------------------------------------------------------------------
  // Returns live status info about the plugin, the open file, and the current
  // selection. Used by figma_get_status and figma_list_open_files.
  PING: async function (msg) {
    try {
      var fileKey = figma.fileKey !== undefined && figma.fileKey !== null ? figma.fileKey : null;
      var fileName = figma.root !== null ? figma.root.name : '';
      var currentPageName = figma.currentPage !== null ? figma.currentPage.name : '';
      var currentPageId = figma.currentPage !== null ? figma.currentPage.id : '';
      var selectionCount = figma.currentPage !== null ? figma.currentPage.selection.length : 0;

      figma.ui.postMessage({
        type: 'PING_RESULT',
        requestId: msg.requestId,
        success: true,
        data: {
          connected: true,
          fileKey: fileKey,
          fileName: fileName,
          editorType: editorInfo.type,
          currentPage: currentPageName,
          currentPageId: currentPageId,
          selectionCount: selectionCount,
        },
      });
    } catch (error: any) {
      var errorMsg = error && error.message ? error.message : String(error);
      figma.ui.postMessage({
        type: 'PING_RESULT',
        requestId: msg.requestId,
        success: false,
        error: errorMsg,
      });
    }
  },
};
