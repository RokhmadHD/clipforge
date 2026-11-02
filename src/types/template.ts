export type ParamValue = string | number | boolean;

/** Parameter specs a template can declare. The inspector renders a form from these.
 *  Planned (M5+): "image" | "list" | "graph" for structured scenes (see docs/TEMPLATE_CONTRACT.md). */
export type ParamSpec =
  | { type: "text"; label?: string; default?: string; multiline?: boolean }
  | { type: "color"; label?: string; default?: string }
  | { type: "number"; label?: string; default?: number; min?: number; max?: number; step?: number }
  | { type: "enum"; label?: string; default?: string; values: string[] };

export interface TemplateManifest {
  id: string;
  name: string;
  /** scene = full-screen base layer, overlay = transparent layer on top */
  kind: "scene" | "overlay";
  size: [number, number];
  fps: number;
  defaultDuration: number;
  /** true if the template wants the subtitle words inside its time window (`w` query param) */
  needsWords?: boolean;
  params: Record<string, ParamSpec>;
}
