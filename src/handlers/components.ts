// ============================================================================
// COMPONENT HANDLERS - GET_COMPONENT, GET_LOCAL_COMPONENTS, INSTANTIATE_COMPONENT
// ============================================================================

import { requireCapability } from '../capabilities';

export var componentHandlers: Record<string, (msg: any) => Promise<void>> = {
  GET_COMPONENT: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET' && node.type !== 'INSTANCE') throw new Error('Node is not a component. Type: ' + node.type);
      var isVariant = node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET';
      var componentData = {
        success: true, timestamp: Date.now(), nodeId: msg.nodeId,
        component: {
          id: node.id, name: node.name, type: node.type,
          description: node.description || null, descriptionMarkdown: node.descriptionMarkdown || null,
          visible: node.visible, locked: node.locked, annotations: node.annotations || [],
          isVariant: isVariant,
          componentPropertyDefinitions: (node.type === 'COMPONENT_SET' || (node.type === 'COMPONENT' && !isVariant)) ? node.componentPropertyDefinitions : undefined,
          children: node.children ? node.children.map(function (child: any) { return { id: child.id, name: child.name, type: child.type }; }) : undefined,
        },
      };
      figma.ui.postMessage({ type: 'COMPONENT_DATA', requestId: msg.requestId, data: componentData });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'COMPONENT_ERROR', requestId: msg.requestId, error: error.message || String(error) });
    }
  },

  GET_LOCAL_COMPONENTS: async function (msg) {
    try {
      requireCapability('pages', 'loadAllPagesAsync');
      var components: any[] = [];
      var componentSets: any[] = [];

      function extractComponentData(node: any, isPartOfSet: boolean) {
        var data: any = { key: node.key, nodeId: node.id, name: node.name, type: node.type, description: node.description || null, width: node.width, height: node.height };
        if (!isPartOfSet && node.componentPropertyDefinitions) {
          data.properties = [];
          var propDefs = node.componentPropertyDefinitions;
          for (var propName in propDefs) {
            if (propDefs.hasOwnProperty(propName)) {
              data.properties.push({ name: propName, type: propDefs[propName].type, defaultValue: propDefs[propName].defaultValue });
            }
          }
        }
        return data;
      }

      function extractComponentSetData(node: any) {
        var variantAxes: Record<string, string[]> = {};
        var variants: any[] = [];
        if (node.children) {
          node.children.forEach(function (child: any) {
            if (child.type === 'COMPONENT') {
              var variantProps: Record<string, string> = {};
              var parts = child.name.split(',').map(function (p: string) { return p.trim(); });
              parts.forEach(function (part: string) {
                var kv = part.split('=');
                if (kv.length === 2) {
                  var key = kv[0].trim(); var value = kv[1].trim();
                  variantProps[key] = value;
                  if (!variantAxes[key]) variantAxes[key] = [];
                  if (variantAxes[key].indexOf(value) === -1) variantAxes[key].push(value);
                }
              });
              variants.push({ key: child.key, nodeId: child.id, name: child.name, description: child.description || null, variantProperties: variantProps, width: child.width, height: child.height });
            }
          });
        }
        var axes: any[] = [];
        for (var axisName in variantAxes) { if (variantAxes.hasOwnProperty(axisName)) axes.push({ name: axisName, values: variantAxes[axisName] }); }
        return {
          key: node.key, nodeId: node.id, name: node.name, type: 'COMPONENT_SET', description: node.description || null,
          variantAxes: axes, variants: variants, defaultVariant: variants.length > 0 ? variants[0] : null,
          properties: node.componentPropertyDefinitions ? Object.keys(node.componentPropertyDefinitions).map(function (propName: string) { var propDef = node.componentPropertyDefinitions[propName]; return { name: propName, type: propDef.type, defaultValue: propDef.defaultValue }; }) : [],
        };
      }

      function findComponents(node: any) {
        if (!node) return;
        if (node.type === 'COMPONENT_SET') componentSets.push(extractComponentSetData(node));
        else if (node.type === 'COMPONENT') { if (!node.parent || node.parent.type !== 'COMPONENT_SET') components.push(extractComponentData(node, false)); }
        if (node.children) node.children.forEach(function (child: any) { findComponents(child); });
      }

      await figma.loadAllPagesAsync();
      var pages = figma.root.children;
      var PAGE_BATCH_SIZE = 3;
      for (var pageIndex = 0; pageIndex < pages.length; pageIndex += PAGE_BATCH_SIZE) {
        var batchEnd = Math.min(pageIndex + PAGE_BATCH_SIZE, pages.length);
        for (var j = pageIndex; j < batchEnd; j++) findComponents(pages[j]);
        if (batchEnd < pages.length) await new Promise(function (resolve) { setTimeout(resolve, 0); });
      }

      figma.ui.postMessage({ type: 'GET_LOCAL_COMPONENTS_RESULT', requestId: msg.requestId, success: true, data: { components: components, componentSets: componentSets, totalComponents: components.length, totalComponentSets: componentSets.length, fileName: figma.root.name, fileKey: figma.fileKey || null, timestamp: Date.now() } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'GET_LOCAL_COMPONENTS_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },

  INSTANTIATE_COMPONENT: async function (msg) {
    try {
      var component: any = null;
      if (msg.componentKey) { try { component = await figma.importComponentByKeyAsync(msg.componentKey); } catch (e) {} }
      if (!component && msg.nodeId) {
        var node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node) {
          if (node.type === 'COMPONENT') component = node;
          else if (node.type === 'COMPONENT_SET') {
            if (msg.variant && node.children && node.children.length > 0) {
              var variantParts: string[] = [];
              for (var prop in msg.variant) { if (msg.variant.hasOwnProperty(prop)) variantParts.push(prop + '=' + msg.variant[prop]); }
              var targetVariantName = variantParts.join(', ');
              for (var i = 0; i < node.children.length; i++) { if (node.children[i].type === 'COMPONENT' && node.children[i].name === targetVariantName) { component = node.children[i]; break; } }
              if (!component) { for (var i = 0; i < node.children.length; i++) { if (node.children[i].type === 'COMPONENT') { var matches = true; for (var prop in msg.variant) { if (msg.variant.hasOwnProperty(prop) && node.children[i].name.indexOf(prop + '=' + msg.variant[prop]) === -1) { matches = false; break; } } if (matches) { component = node.children[i]; break; } } } }
            }
            if (!component && node.children && node.children.length > 0) component = node.children[0];
          }
        }
      }
      if (!component) throw new Error('Component not found. Call figma_search_components for fresh identifiers.');
      var instance: any = component.createInstance();
      if (msg.position) { instance.x = msg.position.x || 0; instance.y = msg.position.y || 0; }
      if (msg.size) instance.resize(msg.size.width, msg.size.height);
      if (msg.overrides) { for (var propName in msg.overrides) { if (msg.overrides.hasOwnProperty(propName)) { try { instance.setProperties({ [propName]: msg.overrides[propName] }); } catch (e) {} } } }
      if (msg.variant) { try { instance.setProperties(msg.variant); } catch (e) {} }
      if (msg.parentId) { var parent = await figma.getNodeByIdAsync(msg.parentId); if (parent && 'appendChild' in parent) parent.appendChild(instance); }
      figma.ui.postMessage({ type: 'INSTANTIATE_COMPONENT_RESULT', requestId: msg.requestId, success: true, instance: { id: instance.id, name: instance.name, x: instance.x, y: instance.y, width: instance.width, height: instance.height } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'INSTANTIATE_COMPONENT_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
};
