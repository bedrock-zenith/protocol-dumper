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
   double: "f64",
} as const;

export type AheadOfTransformIntegerType = keyof typeof INTEGER_MAP;
export type Integer = (typeof INTEGER_MAP)[AheadOfTransformIntegerType];
export type CommonEncoding = "little_endian" | "big_endian" | "native";
export type IntegerEncoding = "leb128" | "zleb128" | CommonEncoding; // native <-> none

export type AheadOfTransformFloatType = keyof typeof FLOAT_MAP;
export type Float = (typeof FLOAT_MAP)[AheadOfTransformFloatType];
export type BuildInNames =
   "array" | "optional" | "integer" | "float" | "void" | "string";

export interface BaseDefinition {
   name: string;
   description?: string;
}

export interface BaseTypeDefinition extends BaseDefinition {
   is_bind_type: boolean;
   constrain?: string;
}

export type TypeDefinition =
   | StringTypeDefinition
   | IntegerTypeDefinition
   | BaseTypeDefinition
   | OptionalTypeDefinition
   | BooleanTypeDefinition;

export interface VoidTypeDefinition extends BaseTypeDefinition {
   name: "void";
   is_bind_type: false;
}
export interface StringTypeDefinition extends BaseTypeDefinition {
   name: "string";
   is_bind_type: false;
   length_type: IntegerTypeDefinition;
   max_length?: number;
}

export interface IntegerTypeDefinition extends BaseTypeDefinition {
   name: "integer";
   is_bind_type: false;
   interpretation: Integer;
   encoding: IntegerEncoding;
}

export interface BooleanTypeDefinition extends BaseTypeDefinition {
   name: "boolean";
   is_bind_type: false;
   encoding: "boolean";
}

export interface FloatTypeDefinition extends BaseTypeDefinition {
   name: "float";
   is_bind_type: false;
   interpretation: Float;
   encoding: CommonEncoding;
}

export interface ArrayTypeDefinition extends BaseTypeDefinition {
   name: "array";
   is_bind_type: false;
   length_type: IntegerTypeDefinition;
   child_type: TypeDefinition;
   min_length?: number;
   max_length?: number;
}

export interface OptionalTypeDefinition extends BaseTypeDefinition {
   name: "optional";
   is_bind_type: false;
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
