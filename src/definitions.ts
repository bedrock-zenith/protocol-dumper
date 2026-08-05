export const INTEGER_MAP = {
   // Signed Integers
   int8: "i8",
   int16: "i16",
   int32: "i32",
   int64: "i64",
   //"int128": "i128",

   uint8: "u8",
   uint16: "u16",
   uint32: "u32",
   uint64: "u64",
   //"uint128": "u128",
} as const;

export const FLOAT_MAP = {
   // "half": "f16"
   float: "f32",
   //"double": "f64",
} as const;

export type AheadOfTransformIntegerType = keyof typeof INTEGER_MAP;
export type Integer = (typeof INTEGER_MAP)[AheadOfTransformIntegerType];
export type CommonEncoding = "little-endian" | "big-endian" | "native";
export type IntegerEncoding = "leb128" | "zleb128" | CommonEncoding; // native <-> none

export type AheadOfTransformFloatType = keyof typeof FLOAT_MAP;
export type Float = (typeof FLOAT_MAP)[AheadOfTransformFloatType];
export type BuildInNames = "array" | "optional" | "integer" | "float";

export interface BaseDefinition {
   name: string;
   description?: string;
}

export interface BaseTypeDefinition extends BaseDefinition {
   is_bind_type: boolean;
}

export type TypeDefinition =
   | StringTypeDefinition
   | IntegerTypeDefinition
   | BaseTypeDefinition
   | OptionalTypeDefinition
   | BooleanTypeDefinition;

export interface StringTypeDefinition extends BaseTypeDefinition {
   length_type: IntegerTypeDefinition;
   max_length?: number;
}

export interface IntegerTypeDefinition extends BaseTypeDefinition {
   name: "integer";
   interpretation: Integer;
   encoding: IntegerEncoding;
}

export interface BooleanTypeDefinition extends BaseTypeDefinition {
   name: "boolean";
   encoding: "boolean";
}

export interface FloatTypeDefinition extends BaseTypeDefinition {
   name: "float";
   interpretation: Float;
   encoding: CommonEncoding;
}

export interface ArrayTypeDefinition extends BaseTypeDefinition {
   name: "array";
   length_type: IntegerTypeDefinition;
   child_type: TypeDefinition;
   min_length?: number;
   max_length?: number;
}

export interface OptionalTypeDefinition extends BaseTypeDefinition {
   name: "optional";
   child_type: TypeDefinition;
}

export interface FieldDefinition extends BaseDefinition {
   type: TypeDefinition;
}

export interface StructDefinition extends BaseDefinition {
   fields: FieldDefinition[];
}

export interface PacketDefinition extends BaseDefinition {
   id: number;
   payload: TypeDefinition;
}

export interface EnumDefinition extends BaseDefinition {
   enum: Record<string, number>;
   backing_integer: Integer;
}

export interface EnumTypeDefinition extends BaseTypeDefinition {
   is_bind_type: true;
   encoding: "literal-key" | "value";
   integer_encoding: IntegerTypeDefinition;
}

export interface FileDefinition extends BaseDefinition {
   protocol: number;
   kind: "enum" | "struct" | "metadata";
   data: StructDefinition | EnumDefinition;
}

/*
export interface EnumDefinition extends BaseTypeDefinition {
   kind: "enum";
   enum: Record<string, number>;
   backing_integer: Integer;
}

export interface StructDefinition extends BaseTypeDefinition {
   kind: "struct";
   fields: FieldDefinition;
}

export interface OptionalTypeDefinition extends BaseTypeDefinition {
   kind: "optional";
   element_type: TypeDefinition;
}

export interface FieldDefinition extends BaseDefinition {
   type: TypeDefinition;
   encoding: Encoding | null;
} */

/* {
    "title": "Achievement",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "/Achievement.json",
    "x-format-version": "MISSING VERSION",
    "x-minecraft-version": "1.26.50-beta.22",
    "x-protocol-version": 2177,
    "type": "object",
    "properties": {
        "Achievement ID": {
            "$ref": "./MinecraftEventing__AchievementIds.json",
            "x-underlying-type": "uint8",
            "x-serialization-options": [
                "Compression",
                "Enum-as-Value"
            ],
            "x-ordinal-index": 0
        }
    },
    "required": [
        "Achievement ID"
    ]
} */
