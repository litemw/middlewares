export type TransformFunction<I = unknown, O = unknown> = (arg: I) => O;
export type ClassSchema<C> = { new (): C };
