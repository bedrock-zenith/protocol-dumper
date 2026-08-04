import { join, resolve } from "node:path";
import { DIRECTORY } from "./bds";
import { mkdir, rm } from "node:fs/promises";
import { Registry } from "./registry";

console.log(DIRECTORY);
const OUTPUT = "dump";

const protocol_dump = resolve(
   join(DIRECTORY, "docs", "json_schemas", "protocol"),
);

await rm(OUTPUT, { recursive: true }).catch((_) => null);
await mkdir(OUTPUT).catch((_) => null);
const registry = new Registry(protocol_dump, OUTPUT);

await registry.load();

await registry.dump();
