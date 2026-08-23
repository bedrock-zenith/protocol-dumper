export const LAYOUT_KEYS = {
    EMPTY_ENCODING_INFORMATION: '%%EMPTY_ENCODING_INFORMATION%%',
    ARRAY: '%%ARRAY%%',
    BOOLEAN: '%%BOOLEAN%%',
    DDUI_DYNAMIC: '%%DDUIDynamic%%',
    NBT_COMPOUND: '%%NBTCompound%%',
    OPTIONAL: '%%OPTIONAL%%',
    STRING: '%%STRING%%',
    STRUCT_ENCODING_INFORMATION: '%%STRUCT_ENCODING_INFORMATION%%',
    SYMBOL: '%%SYMBOL%%',
    ALIAS: '%%ALIAS%%',
    VOID: '%%VOID%%'
} as const;

export const SCHEMA_KEYS = {
    ID: '$id',
    SCHEMA: '$schema',
    FORMAT_VERSION: 'x-format-version',
    PROTOCOL_VERSION: 'x-protocol-version',
    MINECRAFT_VERSION: 'x-minecraft-version',
    TITLE: 'title',
    REF: '$ref',
    ONE_OF: 'oneOf',
    TYPE: 'type',
    ENUM: 'enum',
    ADDITIONAL_PROPERTIES: 'additionalProperties',
    PROPERTY_NAMES: 'propertyNames',
    DESCRIPTION: 'description',
    UNDERLYING_TYPE: 'x-underlying-type',
    MINIMUM: 'minimum',
    MAXIMUM: 'maximum',
    ITEMS: 'items',
    SERIALIZATION_OPTIONS: 'x-serialization-options',
    MAX_LENGTH: 'maxLength',
    MIN_LENGTH: 'minLength',
    PATTERN: 'pattern',
    REQUIRED: 'required',
    PROPERTIES: 'properties',
    CONST: 'const',
    DEFAULT: 'default',
    ORDINAL_INDEX: 'x-ordinal-index',
    RUNTIME_CONSTRAINT_DESCRIPTION: 'x-runtime-constraint-description'
} as const;

export const SERIALIZATION_OPTIONS = {
    COMPRESSION: 'Compression',
    NO_SIZE_COMPRESSION: 'No size compression',
    BIG_ENDIAN: 'Big Endian',
    LITTLE_ENDIAN: 'Little Endian',
    ENUM_AS_VALUE: 'Enum-as-Value',
    ALLOW_UNKNOWN_ENUM_VALUES: 'Allow unknown enum values'
} as const;

export const DYNAMIC_VALUE_DESCRIPTION = 'Dynamic value' as const;

// Allowed to change, depends on version you emit docs for
export const BOOLEAN_SPECIAL_CASES = [
    'Died In Raid',
    'Success',
    'Was Targeting Bartering Player',
    'Filter Profanity Change'
] as const;

// Allowed to change, depends on version you emit docs for
export const INTEGER_SPECIAL_CASES = [
    'Container Id',
    'M Stop Expression Version',
    'Container Type',
    'Input Data',
    'Player Permission Level',
    'Hud Element',
    'Filter Profanity Change'
] as const;

export const NUMERIC_SCOPES = {
    ARRAY: 'array',
    UNION: 'union',
    STRING: 'string',
    ENUM: 'enum',
    INTEGER: 'integer',
    FLOAT: 'float'
} as const;
