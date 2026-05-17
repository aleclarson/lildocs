declare module "culori" {
  export type Color = {
    mode?: string;
    alpha?: number;
    [channel: string]: string | number | undefined;
  };

  export function clampGamut(mode: string): (color: Color) => Color;
  export function converter(mode: string): (color: Color) => Color | undefined;
  export function formatHex(color: Color): string;
  export function parse(color: string): Color | undefined;
  export function wcagContrast(a: Color, b: Color): number;
}
