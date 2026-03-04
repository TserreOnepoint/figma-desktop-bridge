// ============================================================================
// CONSOLE CAPTURE -- Intercept console.* in the QuickJS sandbox and forward
// to ui.html via postMessage so the WebSocket bridge can relay them to the MCP
// server. This enables console monitoring without CDP.
// ============================================================================

export function setupConsoleCapture(): void {
  var levels: string[] = ['log', 'info', 'warn', 'error', 'debug'];
  var originals: Record<string, Function> = {};
  for (var i = 0; i < levels.length; i++) {
    originals[levels[i]] = (console as any)[levels[i]];
  }

  function safeSerialize(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
    try {
      return JSON.parse(JSON.stringify(val));
    } catch (e) {
      return String(val);
    }
  }

  for (var i = 0; i < levels.length; i++) {
    (function (level: string) {
      (console as any)[level] = function () {
        originals[level].apply(console, arguments);
        var args: any[] = [];
        for (var j = 0; j < arguments.length; j++) {
          args.push(safeSerialize(arguments[j]));
        }
        var messageParts: string[] = [];
        for (var j = 0; j < arguments.length; j++) {
          messageParts.push(typeof arguments[j] === 'string' ? arguments[j] : String(arguments[j]));
        }
        figma.ui.postMessage({
          type: 'CONSOLE_CAPTURE',
          level: level,
          message: messageParts.join(' '),
          args: args,
          timestamp: Date.now(),
        });
      };
    })(levels[i]);
  }
}
