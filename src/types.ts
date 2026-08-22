export type SchemaType =
   "object" | "string" | "integer" | "number" | "array" | "boolean";
export interface SchemaFile extends SchemaDefinition {
   title: string;
   $schema: string;
   $id: string;
   "x-format-version": string;
   "x-minecraft-version": string;
   "x-protocol-version": number;
   type: SchemaType;
   $metaProperties?: {
      "[cereal:packet]": number;
      "[cereal:packet_details]": string;
   };
}
export type SchemaField = SchemaDefinition & {
   "x-ordinal-index": number;
   default?: any;
};
export interface SchemaDefinition {
   description?: string;
   pattern?: string;
   oneOf: SchemaDefinition[];
   type: SchemaType;
   propertyNames: SchemaDefinition;
   properties?: Record<string, SchemaField>;
   required?: string[];
   "x-underlying-type"?: string;
   "x-serialization-options"?: string[];
   enum?: string[];
   const?: string;
   $ref?: string;
   minimum?: number;
   maximum?: number;
   items?: SchemaDefinition;
   minItems?: number;
   maxItems?: number;
   maxLength?: number;
   minLength?: number;

   maxProperties?: number;
   // the serialization is very similar to the array of structs with key, value fields,
   // i guess it shouldn't repeat different values for same key, but at the protocol level it shouldn't matter
   additionalProperties?:
      | {
           type: "object";
           properties: {
              key: SchemaDefinition;
           };
           value: SchemaDefinition;
        }
      | SchemaDefinition;
   "x-runtime-constraint-description"?: string;
   "x-control-value-type"?: string;
}
