// ============================================================================
// STARTUP -- Capability detection + data initialization
// Each phase is independently try/caught so one failure doesn't block the rest
// ============================================================================

import { capabilities, capabilityErrors, editorInfo } from './capabilities';
import { serializeVariable, serializeCollection } from './utils/serialize';

export async function initialize(): Promise<void> {
  console.log('🌉 [Desktop Bridge] Initializing...');

  // ---- Phase 0: Editor type (always available) ----
  try {
    editorInfo.type = (figma as any).editorType || 'unknown';
  } catch (e: any) {
    editorInfo.type = 'unknown';
  }
  console.log('🌉 [Desktop Bridge] Editor type: ' + editorInfo.type);

  // ---- Phase 1: Variables API ----
  try {
    var variables = await figma.variables.getLocalVariablesAsync();
    var collections = await figma.variables.getLocalVariableCollectionsAsync();
    capabilities.variables = true;

    console.log(
      '🌉 [Desktop Bridge] Found ' + variables.length + ' variables in ' + collections.length + ' collections'
    );

    var variablesData = {
      success: true,
      timestamp: Date.now(),
      fileKey: figma.fileKey || null,
      variables: variables.map(serializeVariable),
      variableCollections: collections.map(serializeCollection),
    };

    figma.ui.postMessage({ type: 'VARIABLES_DATA', data: variablesData });
    console.log('🌉 [Desktop Bridge] Variables data sent to UI');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'variables', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] Variables API not available: ' + (e.message || String(e)));
  }

  // ---- Phase 2: Load all pages ----
  try {
    await figma.loadAllPagesAsync();
    capabilities.pages = true;
  } catch (e: any) {
    capabilityErrors.push({ feature: 'pages', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] loadAllPagesAsync not available: ' + (e.message || String(e)));
  }

  // ---- Phase 3: Event listeners ----
  // If pages failed, events can't work either — report it explicitly
  if (!capabilities.pages) {
    capabilityErrors.push({ feature: 'events', error: 'Requires multi-page access which is unavailable' });
    console.warn('🌉 [Desktop Bridge] Events skipped: pages capability required');
  } else {
    try {
      // Throttled at 100ms: batches rapid changes (e.g. 50 nodes created at once → 1 message)
      var pendingNodeIds: string[] = [];
      var pendingHasStyle = false;
      var pendingHasNode = false;
      var pendingChangeCount = 0;
      var changeTimer: any = null;

      figma.on('documentchange', function(event: any) {
        for (var i = 0; i < event.documentChanges.length; i++) {
          var change = event.documentChanges[i];
          pendingChangeCount++;
          if (
            change.type === 'STYLE_CREATE' ||
            change.type === 'STYLE_DELETE' ||
            change.type === 'STYLE_PROPERTY_CHANGE'
          ) {
            pendingHasStyle = true;
          } else if (change.type === 'CREATE' || change.type === 'DELETE' || change.type === 'PROPERTY_CHANGE') {
            pendingHasNode = true;
            if (change.id && pendingNodeIds.length < 50) {
              pendingNodeIds.push(change.id);
            }
          }
        }

        if (changeTimer !== null) clearTimeout(changeTimer);
        changeTimer = setTimeout(function() {
          if (pendingHasStyle || pendingHasNode) {
            figma.ui.postMessage({
              type: 'DOCUMENT_CHANGE',
              data: {
                hasStyleChanges: pendingHasStyle,
                hasNodeChanges:  pendingHasNode,
                changedNodeIds:  pendingNodeIds.slice(),
                changeCount:     pendingChangeCount,
                timestamp:       Date.now(),
              },
            });
          }
          pendingNodeIds    = [];
          pendingHasStyle   = false;
          pendingHasNode    = false;
          pendingChangeCount = 0;
          changeTimer       = null;
        }, 100);
      });

      figma.on('selectionchange', function () {
        var selection = figma.currentPage.selection;
        var selectedNodes: any[] = [];
        for (var i = 0; i < Math.min(selection.length, 50); i++) {
          var node = selection[i];
          selectedNodes.push({
            id: node.id,
            name: node.name,
            type: node.type,
            width: node.width,
            height: node.height,
          });
        }
        figma.ui.postMessage({
          type: 'SELECTION_CHANGE',
          data: {
            nodes: selectedNodes,
            count: selection.length,
            page: figma.currentPage.name,
            timestamp: Date.now(),
          },
        });
      });

      figma.on('currentpagechange', function () {
        figma.ui.postMessage({
          type: 'PAGE_CHANGE',
          data: {
            pageId: figma.currentPage.id,
            pageName: figma.currentPage.name,
            timestamp: Date.now(),
          },
        });
      });

      capabilities.events = true;
      console.log('🌉 [Desktop Bridge] Event listeners registered');
    } catch (e: any) {
      capabilityErrors.push({ feature: 'events', error: e.message || String(e) });
      console.warn('🌉 [Desktop Bridge] Event listeners failed: ' + (e.message || String(e)));
    }
  }

  // ---- Phase 4: Styles API ----
  try {
    // Just check the function exists — don't call it (can be slow on large files)
    if (typeof (figma as any).getLocalPaintStylesAsync !== 'function') {
      throw new Error('getLocalPaintStylesAsync not available');
    }
    capabilities.styles = true;
    console.log('🌉 [Desktop Bridge] Styles API available');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'styles', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] Styles API not available: ' + (e.message || String(e)));
  }

  // ---- Phase 5: Component support ----
  try {
    // Just check functions exist — don't traverse the node tree (findAllWithCriteria is O(n))
    if (typeof figma.currentPage.findAllWithCriteria !== 'function') {
      throw new Error('findAllWithCriteria not available');
    }
    if (typeof (figma as any).importComponentByKeyAsync !== 'function') {
      throw new Error('importComponentByKeyAsync not available');
    }
    capabilities.components = true;
    console.log('🌉 [Desktop Bridge] Component operations available');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'components', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] Component operations not available: ' + (e.message || String(e)));
  }

  // ---- Phase 6: Node creation ----
  try {
    var hasCreate =
      typeof (figma as any).createRectangle === 'function' &&
      typeof (figma as any).createFrame === 'function' &&
      typeof (figma as any).createEllipse === 'function';
    if (!hasCreate) {
      throw new Error('Node creation functions (createRectangle, createFrame, createEllipse) not found');
    }
    capabilities.nodeCreation = true;
    console.log('🌉 [Desktop Bridge] Node creation available');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'nodeCreation', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] Node creation not available: ' + (e.message || String(e)));
  }

  // ---- Phase 7: Text operations ----
  try {
    if (typeof (figma as any).createText !== 'function') {
      throw new Error('createText not available');
    }
    if (typeof (figma as any).loadFontAsync !== 'function') {
      throw new Error('loadFontAsync not available');
    }
    capabilities.textOperations = true;
    console.log('🌉 [Desktop Bridge] Text operations available');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'textOperations', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] Text operations not available: ' + (e.message || String(e)));
  }

  // ---- Phase 8: Export / Screenshot ----
  try {
    if (typeof (figma as any).base64Encode !== 'function') {
      throw new Error('base64Encode not available');
    }
    // Verify exportAsync exists on current page (non-destructive)
    if (typeof figma.currentPage.exportAsync !== 'function') {
      throw new Error('exportAsync not available on page');
    }
    capabilities.exportScreenshot = true;
    console.log('🌉 [Desktop Bridge] Export/screenshot available');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'exportScreenshot', error: e.message || String(e) });
    console.warn('🌉 [Desktop Bridge] Export/screenshot not available: ' + (e.message || String(e)));
  }

  // ---- Send capabilities report to UI ----
  figma.ui.postMessage({
    type: 'CAPABILITIES',
    capabilities: capabilities,
    errors: capabilityErrors,
    editorType: editorInfo.type,
  });

  // ---- Load bridge config so the UI can start Supabase polling ----
  try {
    const raw = await figma.clientStorage.getAsync('bridgeConfig');
    const config = raw ? JSON.parse(raw as string) : null;
    figma.ui.postMessage({ type: 'BRIDGE_CONFIG_LOADED', config });
  } catch {
    figma.ui.postMessage({ type: 'BRIDGE_CONFIG_LOADED', config: null });
  }

  console.log('🌉 [Desktop Bridge] Init complete. Editor: ' + editorInfo.type + ', Capabilities: ' + JSON.stringify(capabilities));
  if (capabilityErrors.length > 0) {
    console.warn(
      '🌉 [Desktop Bridge] Unavailable (' + capabilityErrors.length + '): ' +
        capabilityErrors
          .map(function (e) {
            return e.feature;
          })
          .join(', ')
    );
  }
}
