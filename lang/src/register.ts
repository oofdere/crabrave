// Preload this (e.g. `bun --preload @oofdere/crabrave-lang/register`) to import `.crab` files from Bun.
import { crabrave } from "./bun.ts";

Bun.plugin(crabrave);
