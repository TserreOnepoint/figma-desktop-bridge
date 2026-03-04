// Helper function to serialize a variable for response
export function serializeVariable(v: any): any {
  return {
    id: v.id,
    name: v.name,
    key: v.key,
    resolvedType: v.resolvedType,
    valuesByMode: v.valuesByMode,
    variableCollectionId: v.variableCollectionId,
    scopes: v.scopes,
    description: v.description,
    hiddenFromPublishing: v.hiddenFromPublishing,
  };
}

// Helper function to serialize a collection for response
export function serializeCollection(c: any): any {
  return {
    id: c.id,
    name: c.name,
    key: c.key,
    modes: c.modes,
    defaultModeId: c.defaultModeId,
    variableIds: c.variableIds,
  };
}
