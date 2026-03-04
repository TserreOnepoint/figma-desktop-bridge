// ============================================================================
// CAPABILITY DETECTION -- Track which APIs are available in this editor
// Figma Slides, Dev Mode, etc. may not support all APIs (e.g., no Variables)
// ============================================================================

export var capabilities: Record<string, boolean> = {
  variables: false,
  pages: false,
  events: false,
};

export var capabilityErrors: Array<{ feature: string; error: string }> = [];

export function requireCapability(name: string, label?: string): void {
  if (!capabilities[name]) {
    throw new Error((label || name) + ' is not available in this editor');
  }
}
