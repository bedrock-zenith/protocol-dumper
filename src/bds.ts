import {
    DisposableMode,
    getLatestBuildVersionFromOSS,
    getSpecificDownloadLinkOSS,
    Installation
} from '@bedrock-apis/bds-utils';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform, argv } from 'node:process';

const is_preview = argv.map((_) => _.toLowerCase()).includes('--preview');
const version = await getLatestBuildVersionFromOSS({
    platform: platform,
    preview: is_preview
}).catch((_) => null);

console.log(version);

if (!version) throw new ReferenceError('No version found');

await using installation = await Installation.From({
    directory: '.bds-cache/' + version,
    disposableMode: DisposableMode.StopRunningServes
});

if (!installation.getExecutableFile()) {
    const link = await getSpecificDownloadLinkOSS({
        platform: platform,
        preview: is_preview,
        version: version
    }).catch((_) => null);

    console.log('link: ' + link);
    console.log('Installing BDS . . .');
    if (!link) throw new ReferenceError('Installation not found');

    await installation.install(link);
}

console.log('running  . . .');

if (!existsSync(join(installation.directory, 'docs'))) {
    const process = await installation.runWithTestConfig(
        { generate_documentation: true },
        null
    );

    await process.wait();
}

export const DIRECTORY = installation.directory;
