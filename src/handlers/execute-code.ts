// ============================================================================
// EXECUTE_CODE - Arbitrary code execution (Power Tool)
// ============================================================================

export var executeCodeHandlers: Record<string, (msg: any) => Promise<void>> = {
  EXECUTE_CODE: async function (msg) {
    try {
      console.log('\uD83C\uDF09 [Desktop Bridge] Executing code, length:', msg.code.length);
      var wrappedCode = '(async function() {\n' + msg.code + '\n})()';
      console.log('\uD83C\uDF09 [Desktop Bridge] Wrapped code for eval');
      var timeoutMs = msg.timeout || 5000;
      var timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('Execution timed out after ' + timeoutMs + 'ms')); }, timeoutMs);
      });
      var codePromise;
      try {
        codePromise = eval(wrappedCode);
      } catch (syntaxError: any) {
        var syntaxErrorMsg = syntaxError && syntaxError.message ? syntaxError.message : String(syntaxError);
        console.error('\uD83C\uDF09 [Desktop Bridge] Syntax error in code:', syntaxErrorMsg);
        figma.ui.postMessage({ type: 'EXECUTE_CODE_RESULT', requestId: msg.requestId, success: false, error: 'Syntax error: ' + syntaxErrorMsg });
        return;
      }
      var result = await Promise.race([codePromise, timeoutPromise]);
      console.log('\uD83C\uDF09 [Desktop Bridge] Code executed successfully, result type:', typeof result);
      var resultAnalysis: any = { type: typeof result, isNull: result === null, isUndefined: result === undefined, isEmpty: false, warning: null };
      if (Array.isArray(result)) {
        resultAnalysis.isEmpty = result.length === 0;
        if (resultAnalysis.isEmpty) resultAnalysis.warning = 'Code returned an empty array. If you were searching for nodes, none were found.';
      } else if (result !== null && typeof result === 'object') {
        var keys = Object.keys(result);
        resultAnalysis.isEmpty = keys.length === 0;
        if (resultAnalysis.isEmpty) resultAnalysis.warning = 'Code returned an empty object.';
        if (result.length === 0 || result.count === 0 || result.foundCount === 0 || (result.nodes && result.nodes.length === 0)) {
          resultAnalysis.warning = 'Code returned a result indicating nothing was found (count/length is 0).';
        }
      } else if (result === null) {
        resultAnalysis.warning = 'Code returned null. The requested node or resource may not exist.';
      } else if (result === undefined) {
        resultAnalysis.warning = 'Code returned undefined. Make sure your code has a return statement.';
      }
      if (resultAnalysis.warning) console.warn('\uD83C\uDF09 [Desktop Bridge] Result warning:', resultAnalysis.warning);
      figma.ui.postMessage({ type: 'EXECUTE_CODE_RESULT', requestId: msg.requestId, success: true, result: result, resultAnalysis: resultAnalysis, fileContext: { fileName: figma.root.name, fileKey: figma.fileKey || null } });
    } catch (error: any) {
      var errorName = error && error.name ? error.name : 'Error';
      var errorMsg = error && error.message ? error.message : String(error);
      var errorStack = error && error.stack ? error.stack : '';
      console.error('\uD83C\uDF09 [Desktop Bridge] Code execution error: [' + errorName + '] ' + errorMsg);
      if (errorStack) console.error('\uD83C\uDF09 [Desktop Bridge] Stack:', errorStack);
      figma.ui.postMessage({ type: 'EXECUTE_CODE_RESULT', requestId: msg.requestId, success: false, error: errorName + ': ' + errorMsg });
    }
  },
};
