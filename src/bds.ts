import {
    DisposableMode,
    getLatestBuildVersionFromService,
    getSpecificDownloadLinkManual,
    Installation,
} from "@bedrock-apis/bds-utils";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { platform, argv } from "node:process";

const is_preview = argv.map((_) => _.toLowerCase()).includes("--preview");
var version = await getLatestBuildVersionFromService({
    platform: platform,
    preview: is_preview,
}).catch((_: unknown) => null);

console.log(version);

if (!version) {
    const dir = await readdir(".bds-cache");
    if (dir.length === 0) throw new ReferenceError("No version found");

    dir.sort((a, b) => {
        const aNumbers = a.split(".").map(Number);
        const bNumbers = b.split(".").map(Number);
        for (let i = 0; i < Math.min(aNumbers.length, bNumbers.length); i++) {
            if (aNumbers[i]! - bNumbers[i]! === 0) continue;
            return aNumbers[i]! - bNumbers[i]!;
        }

        return aNumbers.length - b.length;
    });
    version = dir.at(-1)!;
}

await using installation = await Installation.From({
    directory: ".bds-cache/" + version,
    disposableMode: DisposableMode.StopRunningServes,
});

if (!installation.getExecutableFile()) {
    const link = getSpecificDownloadLinkManual({
        platform: platform,
        preview: is_preview,
        version: version,
    });

    console.log("link: " + link);
    console.log("Installing BDS . . .");
    if (!link) throw new ReferenceError("Installation not found");

    await installation.install(link);
}

console.log("running  . . .");

if (!existsSync(join(installation.directory, "docs"))) {
    const process = await installation.runWithTestConfig(
        { generate_documentation: true },
        null,
    );

    await process.wait();
}

export const DIRECTORY = installation.directory;
