// ============================================================================
// COMPONENT PROPERTY HANDLERS + SET_INSTANCE_PROPERTIES
// ============================================================================

export var componentPropertyHandlers: Record<string, (msg: any) => Promise<void>> = {
  ADD_COMPONENT_PROPERTY: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') throw new Error('Node must be a COMPONENT or COMPONENT_SET. Got: ' + node.type);
      if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') throw new Error('Cannot add properties to variant components. Add to the parent COMPONENT_SET instead.');
      var options = undefined;
      if (msg.preferredValues) options = { preferredValues: msg.preferredValues };
      var propertyNameWithId = node.addComponentProperty(msg.propertyName, msg.propertyType, msg.defaultValue, options);
      figma.ui.postMessage({ type: 'ADD_COMPONENT_PROPERTY_RESULT', requestId: msg.requestId, success: true, propertyName: propertyNameWithId });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'ADD_COMPONENT_PROPERTY_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  EDIT_COMPONENT_PROPERTY: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') throw new Error('Node must be a COMPONENT or COMPONENT_SET. Got: ' + node.type);
      var propertyNameWithId = node.editComponentProperty(msg.propertyName, msg.newValue);
      figma.ui.postMessage({ type: 'EDIT_COMPONENT_PROPERTY_RESULT', requestId: msg.requestId, success: true, propertyName: propertyNameWithId });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'EDIT_COMPONENT_PROPERTY_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  DELETE_COMPONENT_PROPERTY: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') throw new Error('Node must be a COMPONENT or COMPONENT_SET. Got: ' + node.type);
      node.deleteComponentProperty(msg.propertyName);
      figma.ui.postMessage({ type: 'DELETE_COMPONENT_PROPERTY_RESULT', requestId: msg.requestId, success: true });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'DELETE_COMPONENT_PROPERTY_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_INSTANCE_PROPERTIES: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (node.type !== 'INSTANCE') throw new Error('Node must be an INSTANCE. Got: ' + node.type);
      var mainComponent = await node.getMainComponentAsync();
      var currentProps = node.componentProperties;
      var propsToSet: Record<string, any> = {};
      var propUpdates = msg.properties || {};
      for (var propName in propUpdates) {
        var newValue = propUpdates[propName];
        if (currentProps[propName] !== undefined) {
          propsToSet[propName] = newValue;
        } else {
          var foundMatch = false;
          for (var existingProp in currentProps) {
            if (existingProp.startsWith(propName + '#')) { propsToSet[existingProp] = newValue; foundMatch = true; break; }
          }
        }
      }
      if (Object.keys(propsToSet).length === 0) throw new Error('No valid properties to set. Available: ' + Object.keys(currentProps).join(', '));
      node.setProperties(propsToSet);
      var updatedProps = node.componentProperties;
      figma.ui.postMessage({ type: 'SET_INSTANCE_PROPERTIES_RESULT', requestId: msg.requestId, success: true, instance: { id: node.id, name: node.name, componentId: mainComponent ? mainComponent.id : null, propertiesSet: Object.keys(propsToSet), currentProperties: Object.keys(updatedProps).reduce(function (acc: any, key: string) { acc[key] = { type: updatedProps[key].type, value: updatedProps[key].value }; return acc; }, {}) } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_INSTANCE_PROPERTIES_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
};
