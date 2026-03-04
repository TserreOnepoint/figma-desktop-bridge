// ============================================================================
// VARIABLE & COLLECTION CRUD + MODE MANAGEMENT + REFRESH
// ============================================================================

import { requireCapability } from '../capabilities';
import { serializeVariable, serializeCollection } from '../utils/serialize';
import { hexToFigmaRGB } from '../utils/color';

export var variableHandlers: Record<string, (msg: any) => Promise<void>> = {
  UPDATE_VARIABLE: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) throw new Error('Variable not found: ' + msg.variableId);
      var value = msg.value;
      if (typeof value === 'string' && value.startsWith('VariableID:')) {
        value = { type: 'VARIABLE_ALIAS', id: value };
      } else if (variable.resolvedType === 'COLOR' && typeof value === 'string') {
        value = hexToFigmaRGB(value);
      }
      variable.setValueForMode(msg.modeId, value);
      figma.ui.postMessage({ type: 'UPDATE_VARIABLE_RESULT', requestId: msg.requestId, success: true, variable: serializeVariable(variable) });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'UPDATE_VARIABLE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  CREATE_VARIABLE: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) throw new Error('Collection not found: ' + msg.collectionId);
      var variable = figma.variables.createVariable(msg.name, collection, msg.resolvedType);
      if (msg.valuesByMode) { for (var modeId in msg.valuesByMode) { var value = msg.valuesByMode[modeId]; if (msg.resolvedType === 'COLOR' && typeof value === 'string') value = hexToFigmaRGB(value); variable.setValueForMode(modeId, value); } }
      if (msg.description) variable.description = msg.description;
      if (msg.scopes) variable.scopes = msg.scopes;
      figma.ui.postMessage({ type: 'CREATE_VARIABLE_RESULT', requestId: msg.requestId, success: true, variable: serializeVariable(variable) });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'CREATE_VARIABLE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  CREATE_VARIABLE_COLLECTION: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var collection = figma.variables.createVariableCollection(msg.name);
      if (msg.initialModeName && collection.modes.length > 0) collection.renameMode(collection.modes[0].modeId, msg.initialModeName);
      if (msg.additionalModes && msg.additionalModes.length > 0) { for (var i = 0; i < msg.additionalModes.length; i++) collection.addMode(msg.additionalModes[i]); }
      figma.ui.postMessage({ type: 'CREATE_VARIABLE_COLLECTION_RESULT', requestId: msg.requestId, success: true, collection: serializeCollection(collection) });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'CREATE_VARIABLE_COLLECTION_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  DELETE_VARIABLE: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) throw new Error('Variable not found: ' + msg.variableId);
      var deletedInfo = { id: variable.id, name: variable.name };
      variable.remove();
      figma.ui.postMessage({ type: 'DELETE_VARIABLE_RESULT', requestId: msg.requestId, success: true, deleted: deletedInfo });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'DELETE_VARIABLE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  DELETE_VARIABLE_COLLECTION: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) throw new Error('Collection not found: ' + msg.collectionId);
      var deletedInfo = { id: collection.id, name: collection.name, variableCount: collection.variableIds.length };
      collection.remove();
      figma.ui.postMessage({ type: 'DELETE_VARIABLE_COLLECTION_RESULT', requestId: msg.requestId, success: true, deleted: deletedInfo });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'DELETE_VARIABLE_COLLECTION_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  RENAME_VARIABLE: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) throw new Error('Variable not found: ' + msg.variableId);
      var oldName = variable.name;
      variable.name = msg.newName;
      var serializedVar = serializeVariable(variable);
      serializedVar.oldName = oldName;
      figma.ui.postMessage({ type: 'RENAME_VARIABLE_RESULT', requestId: msg.requestId, success: true, variable: serializedVar, oldName: oldName });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'RENAME_VARIABLE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_VARIABLE_DESCRIPTION: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var variable = await figma.variables.getVariableByIdAsync(msg.variableId);
      if (!variable) throw new Error('Variable not found: ' + msg.variableId);
      variable.description = msg.description || '';
      figma.ui.postMessage({ type: 'SET_VARIABLE_DESCRIPTION_RESULT', requestId: msg.requestId, success: true, variable: serializeVariable(variable) });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_VARIABLE_DESCRIPTION_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  ADD_MODE: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) throw new Error('Collection not found: ' + msg.collectionId);
      var newModeId = collection.addMode(msg.modeName);
      figma.ui.postMessage({ type: 'ADD_MODE_RESULT', requestId: msg.requestId, success: true, collection: serializeCollection(collection), newMode: { modeId: newModeId, name: msg.modeName } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'ADD_MODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  RENAME_MODE: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var collection = await figma.variables.getVariableCollectionByIdAsync(msg.collectionId);
      if (!collection) throw new Error('Collection not found: ' + msg.collectionId);
      var currentMode = collection.modes.find(function (m: any) { return m.modeId === msg.modeId; });
      if (!currentMode) throw new Error('Mode not found: ' + msg.modeId);
      var oldName = currentMode.name;
      collection.renameMode(msg.modeId, msg.newName);
      var serializedCol = serializeCollection(collection);
      serializedCol.oldName = oldName;
      figma.ui.postMessage({ type: 'RENAME_MODE_RESULT', requestId: msg.requestId, success: true, collection: serializedCol, oldName: oldName });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'RENAME_MODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  REFRESH_VARIABLES: async function (msg) {
    try {
      requireCapability('variables', 'Variables API');
      var variables = await figma.variables.getLocalVariablesAsync();
      var collections = await figma.variables.getLocalVariableCollectionsAsync();
      var variablesData = { success: true, timestamp: Date.now(), fileKey: figma.fileKey || null, variables: variables.map(serializeVariable), variableCollections: collections.map(serializeCollection) };
      figma.ui.postMessage({ type: 'VARIABLES_DATA', data: variablesData });
      figma.ui.postMessage({ type: 'REFRESH_VARIABLES_RESULT', requestId: msg.requestId, success: true, data: variablesData });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'REFRESH_VARIABLES_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
};
