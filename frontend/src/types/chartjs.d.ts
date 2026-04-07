declare module 'chart.js' {
  export type ChartConfiguration<TType extends string = string> = Record<string, unknown>;

  export class Chart<TType extends string = string> {
    static register(...items: unknown[]): void;

    constructor(
      item: HTMLCanvasElement | CanvasRenderingContext2D,
      config: ChartConfiguration<TType>
    );

    destroy(): void;
    update(): void;
  }

  export const registerables: unknown[];
}
