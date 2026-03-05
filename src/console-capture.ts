// ============================================================================
// CONSOLE CAPTURE -- Intercept console.* in the QuickJS sandbox and forward
// to ui.html via postMessage so the bridge relay can surface them to the MCP
// server. Batched at 200ms to avoid flooding postMessage on tight log loops.
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

  // Batch buffer — flushed every 200ms to avoid one postMessage per log entry
  var pending: any[] = [];
  var timer: any = null;

  function flush(): void {
    if (pending.length === 0) return;
    figma.ui.postMessage({ type: 'CONSOLE_LOGS_BATCH', logs: pending.slice() });
    pending = [];
    timer = null;
  }

  for (var i = 0; i < levels.length; i++) {
    (function(level: string) {
      (console as any)[level] = function() {
        originals[level].apply(console, arguments);

        var args: any[] = [];
        var messageParts: string[] = [];
        for (var j = 0; j < arguments.length; j++) {
          args.push(safeSerialize(arguments[j]));
          messageParts.push(typeof arguments[j] === 'string' ? arguments[j] : String(arguments[j]));
        }

        pending.push({
          level:     level,
          message:   messageParts.join(' '),
          args:      args,
          timestamp: Date.now(),
        });

        if (timer === null) {
          timer = setTimeout(flush, 200);
        }
      };
    })(levels[i]);
  }
}
