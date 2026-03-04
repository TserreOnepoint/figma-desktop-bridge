// Figma Desktop Bridge - MCP Plugin
// Bridges Figma API to MCP clients via plugin UI window
// Supports: Variables, Components, Styles, and more
// Uses postMessage to communicate with UI, bypassing worker sandbox limitations
// Puppeteer can access UI iframe's window context to retrieve data

console.log('🌉 [Desktop Bridge] Plugin loaded and ready');

// Show plugin UI - starts expanded, user can collapse via chevron
figma.showUI(__html__, { width: 320, height: 460, visible: true, themeColors: true });

// ---- Setup ----
import { setupConsoleCapture } from './console-capture';
import { initialize } from './startup';

// ---- Handler modules ----
import { executeCodeHandlers } from './handlers/execute-code';
import { variableHandlers } from './handlers/variables';
import { componentHandlers } from './handlers/components';
import { componentPropertyHandlers } from './handlers/component-properties';
import { nodeHandlers } from './handlers/nodes';
import { screenshotHandlers } from './handlers/screenshot';
import { systemHandlers } from './handlers/system';

// ---- Console capture (must run before initialize) ----
setupConsoleCapture();

// ---- Build dispatch map from all handler modules ----
var handlers: Record<string, (msg: any) => Promise<void>> = Object.assign(
  {},
  executeCodeHandlers,
  variableHandlers,
  componentHandlers,
  componentPropertyHandlers,
  nodeHandlers,
  screenshotHandlers,
  systemHandlers
);

// ---- Message router (replaces giant if/else chain) ----
figma.ui.onmessage = async (msg: any) => {
  var handler = handlers[msg.type];
  if (handler) {
    await handler(msg);
  }
};

// ---- Initialize (capability detection + data loading) ----
initialize();

console.log('🌉 [Desktop Bridge] Ready to handle requests');
console.log('🌉 [Desktop Bridge] Plugin will stay open until manually closed');

// Plugin stays open - no auto-close
// UI iframe remains accessible for Puppeteer to read data from window object
