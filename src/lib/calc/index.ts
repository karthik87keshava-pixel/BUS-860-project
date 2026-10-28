// DriveTally calculation module: the one place where all cost maths lives.
//   types.ts    – the shapes of inputs and results
//   defaults.ts – Alberta default values with their sources
//   resolve.ts  – fills each column's defaults from the chosen vehicle
//   engine.ts   – the formulas (loan, lease, cash, running costs, resale)
export * from "./types";
export * from "./defaults";
export * from "./engine";
export * from "./resolve";
