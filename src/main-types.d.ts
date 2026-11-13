export interface ProtocolType {
    name: string;
    hash: string;
    bind_type: string;
    [key: string]: unknown;
}

export interface PacketType {
    id: number;
    description: string | null;
    type: unknown;
    [key: string]: unknown;
}

export interface ProtocolNamespaceHeader {
    name: string;
    bind_type: string;
    is_bind_type: boolean;
    protocol_version?: number;
    minecraft_version?: string;
}

export interface ProtocolNamespace extends ProtocolNamespaceHeader {
    enums: ProtocolType[];
    structs: ProtocolType[];
    unions: ProtocolType[];
    aliases: ProtocolType[];
    symbols: ProtocolType[];
    packets?: PacketType[];
    [key: string]: unknown;
}

export interface ProtocolCanonicalNamespace extends ProtocolNamespaceHeader {
    types: ProtocolType[];
    packets?: PacketType[];
    [key: string]: unknown;
}

