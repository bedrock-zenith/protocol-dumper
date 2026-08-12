import { join, resolve } from "node:path";
import { DIRECTORY } from "./bds";
import { mkdir, rm } from "node:fs/promises";
import { Transformer } from "./loader";
import "./utils";

console.log(DIRECTORY);
const OUTPUT = "dump";

const protocol_dump = resolve(
   join(DIRECTORY, "docs", "json_schemas", "protocol"),
);

await rm(OUTPUT, { recursive: true }).catch((_) => null);
await mkdir(OUTPUT).catch((_) => null);

const transformer = await Transformer.from(protocol_dump);

await transformer.load();

await transformer.dump(OUTPUT);

/*
const transformer = new Transformer(protocol_dump, OUTPUT);

for (const path of await readdir(transformer.inputDirectory)) {
   const file = basename(path);
   const data = await transformer.file(file);
   console.log(file);
   await transformer.consume(file, data, null);
}
 */
// const registry = new Registry(protocol_dump, OUTPUT);

// await registry.load();

// await registry.dump();
