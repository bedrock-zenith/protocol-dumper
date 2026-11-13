import { basename, join, resolve } from 'node:path';
import { getDocumentationInstallationDirectory } from './bds';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { Transformer } from './apis/transformer';
import './utils';
import './apis/context';
import { EnumLayoutInformation } from './apis/information/layout/enum';
import { BindTypeInformation } from './apis/information/base';
import { StructLayoutInformation } from './apis/information/layout/struct';
import { AliasInformation, SymbolInformation } from './apis/information/layout/symbol';
import { UnionLayoutInformation } from './apis/information/layout/union';

const getProtocolDumperDirectory = async (is_preview: boolean, version: string): Promise<string> => {
    const DIRECTORY = await getDocumentationInstallationDirectory(is_preview, version);
    const stringify = (value: unknown): string => JSON.stringify(value, null, 2);
    console.log(DIRECTORY);
    const protocol_dump = resolve(join(DIRECTORY, 'docs', 'json_schemas', 'protocol'));
    const transformer = await Transformer.from(protocol_dump);

    transformer.load();

    const protocolVersion = transformer.protocol_version;
    const folderName =
        protocolVersion && protocolVersion !== -1
            ? `${basename(DIRECTORY)}-protocol-${protocolVersion}`
            : basename(DIRECTORY);
    const OUTPUT = join('dump', folderName);

    await rm(OUTPUT, { recursive: true }).catch((_) => null);
    await mkdir(OUTPUT, { recursive: true }).catch((_) => null);

    const HEADER = {
        name: 'protocol',
        is_bind_type: false,
        bind_type: 'namespace',
        protocol_version: transformer.protocol_version,
        minecraft_version: transformer.minecraft_version
    } as const;

    const base = {
        ...HEADER,
        enums: [] as Array<unknown>,
        structs: [] as Array<unknown>,
        unions: [] as Array<unknown>,
        aliases: [] as Array<unknown>,
        symbols: [] as Array<unknown>,
        packets: [] as Array<{ id: number; description: string | null; type: unknown }>
    };

    const canonical = {
        ...HEADER,
        bind_type: 'canonical_namespace',
        types: [] as Array<unknown>,
        packets: base.packets
    };

    for (const any of transformer.register.byName.values()) {
        if (any instanceof BindTypeInformation)
            if (
                [
                    EnumLayoutInformation,
                    StructLayoutInformation,
                    UnionLayoutInformation,
                    SymbolInformation,
                    AliasInformation
                ].some((_) => any instanceof _)
            ) {
                const value = any.dump();
                base[(any.type + (any.type.endsWith('s') ? 'es' : 's')) as unknown as 'structs'].push(value);
                canonical.types.push(value);
                await writeFile(
                    join(OUTPUT, `${any.type}.${any.name.replaceAll(' ', '-').toLowerCase()}.json`),
                    stringify(value)
                );
            }
    }
    for (const { id, type, description } of transformer.register.packets.values()) {
        const any_object: object = {};
        (type as BindTypeInformation).getData(any_object, 'reference');
        base.packets.push({
            id,
            description: description ?? null,
            type: any_object
        });
    }
    await writeFile(join(OUTPUT, '__protocol__.json'), stringify(base));
    await writeFile(join(OUTPUT, '__canonical_protocol__.json'), stringify(canonical));
    return OUTPUT;
};

////////// STABLE /////////////////
for (const v of ['1.26.63.1']) await getProtocolDumperDirectory(false, v);

////////// PREVIEW ////////////////
for (const v of [
    '1.26.60.21',
    '1.26.60.23',
    '1.26.60.25',
    '1.26.60.27',
    '1.26.60.28',
    '1.26.60.29',
    //'1.26.60.30', // Same protocol with stable release
    '1.26.70.20',
    '1.26.70.21',
    '1.26.70.22',
    '1.26.70.23',
    '1.26.70.24'
])
    await getProtocolDumperDirectory(true, v);
