import { join, resolve } from "node:path";
import { DIRECTORY } from "./bds";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { Transformer } from "./apis/transformer";
import "./utils";
import "./apis/context";
import { EnumLayoutInformation } from "./apis/information/layout/enum";
import { BindTypeInformation } from "./apis/information/base";
import { StructLayoutInformation } from "./apis/information/layout/struct";
import {
   AliasInformation,
   SymbolInformation,
} from "./apis/information/layout/symbol";
import { UnionLayoutInformation } from "./apis/information/layout/union";

console.log(DIRECTORY);
const OUTPUT = "dump";

const protocol_dump = resolve(
   join(DIRECTORY, "docs", "json_schemas", "protocol"),
);

await rm(OUTPUT, { recursive: true }).catch((_) => null);
await mkdir(OUTPUT).catch((_) => null);

const transformer = await Transformer.from(protocol_dump);

transformer.load();
const base = {
   name: "protocol",
   bind_type: "namespace",
   is_bind_type: false,
   enums: [] as Array<unknown>,
   structs: [] as Array<unknown>,
   unions: [] as Array<unknown>,
   aliases: [] as Array<unknown>,
   symbols: [] as Array<unknown>,
};
const canonical = {
   name: "protocol",
   bind_type: "canonical_namespace",
   is_bind_type: false,
   types: [] as Array<unknown>,
};
for (const any of transformer.register.byName.values()) {
   if (any instanceof BindTypeInformation)
      if (
         [
            EnumLayoutInformation,
            StructLayoutInformation,
            UnionLayoutInformation,
            SymbolInformation,
            AliasInformation,
         ].some((_) => any instanceof _)
      ) {
         const value = any.dump();
         base[
            (any.type +
               (any.type.endsWith("s") ? "es" : "s")) as unknown as "structs"
         ].push(value);
         canonical.types.push(value);
         await writeFile(
            join(
               OUTPUT,
               any.name.replaceAll(" ", "") + "." + any.type + ".json",
            ),
            JSON.stringify(any.dump(), null, 4),
         );
      }
}
await writeFile(
   join(OUTPUT, "__protocol__.json"),
   JSON.stringify(base, null, 4),
);

await writeFile(
   join(OUTPUT, "__protocol_canonical__.json"),
   JSON.stringify(canonical, null, 4),
);
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
