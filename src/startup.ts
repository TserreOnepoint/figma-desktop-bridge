// ============================================================================
// STARTUP -- Capability detection + data initialization
// Each phase is independently try/caught so one failure doesn't block the rest
// ============================================================================

import { capabilities, capabilityErrors } from './capabilities';
import { serializeVariable, serializeCollection } from './utils/serialize';

export async function initialize(): Promise<void> {
  console.log('\uD83C\uDF09 [Desktop Bridge] Initializing...');

  // ---- Phase 1: Variables API ----
  try {
    var variables = await figma.variables.getLocalVariablesAsync();
    var collections = await figma.variables.getLocalVariableCollectionsAsync();
    capabilities.variables = true;
    console.log('\uD83C\uDF09 [Desktop Bridge] Found ' + variables.length + ' variables in ' + collections.length + ' collections');
    var variablesData = {
      success: true,
      timestamp: Date.now(),
      fileKey: figma.fileKey || null,
      variables: variables.map(serializeVariable),
      variableCollections: collections.map(serializeCollection),
    };
    figma.ui.postMessage({ type: 'VARIABLES_DATA', data: variablesData });
    console.log('\uD83C\uDF09 [Desktop Bridge] Variables data sent to UI');
  } catch (e: any) {
    capabilityErrors.push({ feature: 'variables', error: e.message || String(e) });
    console.warn('\uD83C\uDF09 [Desktop Bridge] Variables API not available: ' + (e.message || String(e)));
  }

  // ---- Phase 2: Load all pages ----
  try {
    await figma.loadAllPagesAsync();
    capabilities.pages = true;
  } catch (e: any) {
    capabilityErrors.push({ feature: 'pages', error: e.message || String(e) });
    console.warn('\uD83C\uDF09 [Desktop Bridge] loadAllPagesAsync not available: ' + (e.message || String(e)));
  }

  // ---- Phase 3: Event listeners (require pages) ----
  if (capabilities.pages) {
    try {
      figma.on('documentchange', function (event: any) {
        var hasStyleChanges = false;
        var hasNodeChanges = false;
        var changedNodeIds: string[] = [];
        for (var i = 0; i < event.documentChanges.length; i++) {
          var change = event.documentChanges[i];
          if (change.type === 'STYLE_CREATE' || change.type === 'STYLE_DELETE' || change.type === 'STYLE_PROPERTY_CHANGE') {
            hasStyleChanges = true;
          } else if (change.type === 'CREATE' || change.type === 'DELETE' || change.type === 'PROPERTY_CHANGE') {
            hasNodeChanges = true;
            if (change.id && changedNodeIds.length < 50) changedNodeIds.push(change.id);
          }
        }
        if (hasStyleChanges || hasNodeChanges) {
          figma.ui.postMessage({ type: 'DOCUMENT_CHANGE', data: { hasStyleChanges: hasStyleChanges, hasNodeChanges: hasNodeChanges, changedNodeIds: changedNodeIds, changeCount: event.documentChanges.length, timestamp: Date.now() } });
        }
      });

      figma.on('selectionchange', function () {
        var selection = figma.currentPage.selection;
        var selectedNodes: any[] = [];
        for (var i = 0; i < Math.min(selection.length, 50); i++) {
          var node = selection[i];
          selectedNodes.push({ id: node.id, name: node.name, type: node.type, width: node.width, height: node.height });
        }
        figma.ui.postMessage({ type: 'SELECTION_CHANGE', data: { nodes: selectedNodes, count: selection.length, page: figma.currentPage.name, timestamp: Date.now() } });
      });

      figma.on('currentpagechange', function () {
        figma.ui.postMessage({ type: 'PAGE_CHANGE', data: { pageId: figma.currentPage.id, pageName: figma.currentPage.name, timestamp: Date.now() } });
      });

      capabilities.events = true;
      console.log('\uD83C\uDF09 [Desktop Bridge] Event listeners registered');
    } catch (e: any) {
      capabilityErrors.push({ feature: 'events', error: e.message || String(e) });
      console.warn('\uD83C\uDF09 [Desktop Bridge] Event listeners failed: ' + (e.message || String(e)));
    }
  }

  // ---- Send capabilities report to UI ----
  figma.ui.postMessage({ type: 'CAPABILITIES', capabilities: capabilities, errors: capabilityErrors });
  console.log('\uD83C\uDF09 [Desktop Bridge] Init complete. Capabilities: ' + JSON.stringify(capabilities));
  if (capabilityErrors.length > 0) {
    console.warn('\uD83C\uDF09 [Desktop Bridge] Unavailable: ' + capabilityErrors.map(function (e) { return e.feature; }).join(', '));
  }
}
