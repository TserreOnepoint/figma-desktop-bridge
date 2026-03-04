// ============================================================================
// CAPABILITY DETECTION -- Track which APIs are available in this editor
// Figma Slides, Dev Mode, FigJam etc. may not support all APIs
// ============================================================================

export var capabilities: Record<string, boolean> = {
  variables: false,
  pages: false,
  events: false,
  styles: false,
  components: false,
  nodeCreation: false,
  textOperations: false,
  exportScreenshot: false,
};

// Editor type: 'figma' | 'figjam' | 'slides' | 'dev' | 'unknown'
export var editorType: string = 'unknown';

export var capabilityErrors: Array<{ feature: string; error: string }> = [];

export function requireCapability(name: string, label?: string): void {
  if (!capabilities[name]) {
    throw new Error((label || name) + ' is not available in this editor (' + editorType + ')');
  }
}
