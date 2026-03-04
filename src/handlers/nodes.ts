// ============================================================================
// NODE MANIPULATION HANDLERS
// ============================================================================

import { hexToFigmaRGB } from '../utils/color';

export var nodeHandlers: Record<string, (msg: any) => Promise<void>> = {
  SET_NODE_DESCRIPTION: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('description' in node)) throw new Error('Node type ' + node.type + ' does not support description');
      node.description = msg.description || '';
      if (msg.descriptionMarkdown && 'descriptionMarkdown' in node) node.descriptionMarkdown = msg.descriptionMarkdown;
      figma.ui.postMessage({ type: 'SET_NODE_DESCRIPTION_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, description: node.description } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_NODE_DESCRIPTION_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  RESIZE_NODE: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('resize' in node)) throw new Error('Node type ' + node.type + ' does not support resize');
      if (msg.withConstraints) node.resize(msg.width, msg.height); else node.resizeWithoutConstraints(msg.width, msg.height);
      figma.ui.postMessage({ type: 'RESIZE_NODE_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, width: node.width, height: node.height } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'RESIZE_NODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  MOVE_NODE: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('x' in node)) throw new Error('Node type ' + node.type + ' does not support positioning');
      node.x = msg.x; node.y = msg.y;
      figma.ui.postMessage({ type: 'MOVE_NODE_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, x: node.x, y: node.y } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'MOVE_NODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_NODE_FILLS: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('fills' in node)) throw new Error('Node type ' + node.type + ' does not support fills');
      node.fills = msg.fills.map(function (fill: any) {
        if (fill.type === 'SOLID' && typeof fill.color === 'string') {
          var rgb = hexToFigmaRGB(fill.color);
          return { type: 'SOLID', color: { r: rgb.r, g: rgb.g, b: rgb.b }, opacity: rgb.a !== undefined ? rgb.a : fill.opacity !== undefined ? fill.opacity : 1 };
        }
        return fill;
      });
      figma.ui.postMessage({ type: 'SET_NODE_FILLS_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_NODE_FILLS_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_NODE_STROKES: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('strokes' in node)) throw new Error('Node type ' + node.type + ' does not support strokes');
      node.strokes = msg.strokes.map(function (stroke: any) {
        if (stroke.type === 'SOLID' && typeof stroke.color === 'string') {
          var rgb = hexToFigmaRGB(stroke.color);
          return { type: 'SOLID', color: { r: rgb.r, g: rgb.g, b: rgb.b }, opacity: rgb.a !== undefined ? rgb.a : stroke.opacity !== undefined ? stroke.opacity : 1 };
        }
        return stroke;
      });
      if (msg.strokeWeight !== undefined) node.strokeWeight = msg.strokeWeight;
      figma.ui.postMessage({ type: 'SET_NODE_STROKES_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_NODE_STROKES_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_NODE_OPACITY: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('opacity' in node)) throw new Error('Node type ' + node.type + ' does not support opacity');
      node.opacity = Math.max(0, Math.min(1, msg.opacity));
      figma.ui.postMessage({ type: 'SET_NODE_OPACITY_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, opacity: node.opacity } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_NODE_OPACITY_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_NODE_CORNER_RADIUS: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('cornerRadius' in node)) throw new Error('Node type ' + node.type + ' does not support corner radius');
      node.cornerRadius = msg.radius;
      figma.ui.postMessage({ type: 'SET_NODE_CORNER_RADIUS_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, cornerRadius: node.cornerRadius } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_NODE_CORNER_RADIUS_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  CLONE_NODE: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (!('clone' in node)) throw new Error('Node type ' + node.type + ' does not support cloning');
      var clonedNode = node.clone();
      figma.ui.postMessage({ type: 'CLONE_NODE_RESULT', requestId: msg.requestId, success: true, node: { id: clonedNode.id, name: clonedNode.name, x: clonedNode.x, y: clonedNode.y } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'CLONE_NODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  DELETE_NODE: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      var deletedInfo = { id: node.id, name: node.name };
      node.remove();
      figma.ui.postMessage({ type: 'DELETE_NODE_RESULT', requestId: msg.requestId, success: true, deleted: deletedInfo });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'DELETE_NODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  RENAME_NODE: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      var oldName = node.name; node.name = msg.newName;
      figma.ui.postMessage({ type: 'RENAME_NODE_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, oldName: oldName } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'RENAME_NODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  SET_TEXT_CONTENT: async function (msg) {
    try {
      var node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node) throw new Error('Node not found: ' + msg.nodeId);
      if (node.type !== 'TEXT') throw new Error('Node must be a TEXT node. Got: ' + node.type);
      await figma.loadFontAsync(node.fontName);
      node.characters = msg.text;
      if (msg.fontSize) node.fontSize = msg.fontSize;
      figma.ui.postMessage({ type: 'SET_TEXT_CONTENT_RESULT', requestId: msg.requestId, success: true, node: { id: node.id, name: node.name, characters: node.characters } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'SET_TEXT_CONTENT_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
  CREATE_CHILD_NODE: async function (msg) {
    try {
      var parent = await figma.getNodeByIdAsync(msg.parentId);
      if (!parent) throw new Error('Parent node not found: ' + msg.parentId);
      if (!('appendChild' in parent)) throw new Error('Parent node type ' + parent.type + ' does not support children');
      var newNode: any; var props = msg.properties || {};
      switch (msg.nodeType) {
        case 'RECTANGLE': newNode = figma.createRectangle(); break;
        case 'ELLIPSE': newNode = figma.createEllipse(); break;
        case 'FRAME': newNode = figma.createFrame(); break;
        case 'TEXT': newNode = figma.createText(); await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); newNode.fontName = { family: 'Inter', style: 'Regular' }; if (props.text) newNode.characters = props.text; break;
        case 'LINE': newNode = figma.createLine(); break;
        case 'POLYGON': newNode = figma.createPolygon(); break;
        case 'STAR': newNode = figma.createStar(); break;
        case 'VECTOR': newNode = figma.createVector(); break;
        default: throw new Error('Unsupported node type: ' + msg.nodeType);
      }
      if (props.name) newNode.name = props.name;
      if (props.x !== undefined) newNode.x = props.x;
      if (props.y !== undefined) newNode.y = props.y;
      if (props.width !== undefined && props.height !== undefined) newNode.resize(props.width, props.height);
      if (props.fills) {
        newNode.fills = props.fills.map(function (fill: any) {
          if (fill.type === 'SOLID' && typeof fill.color === 'string') { var rgb = hexToFigmaRGB(fill.color); return { type: 'SOLID', color: { r: rgb.r, g: rgb.g, b: rgb.b }, opacity: rgb.a !== undefined ? rgb.a : 1 }; }
          return fill;
        });
      }
      parent.appendChild(newNode);
      figma.ui.postMessage({ type: 'CREATE_CHILD_NODE_RESULT', requestId: msg.requestId, success: true, node: { id: newNode.id, name: newNode.name, type: newNode.type, x: newNode.x, y: newNode.y, width: newNode.width, height: newNode.height } });
    } catch (error: any) {
      figma.ui.postMessage({ type: 'CREATE_CHILD_NODE_RESULT', requestId: msg.requestId, success: false, error: error.message || String(error) });
    }
  },
};
