import { SCHEMA_KEYS, SERIALIZATION_OPTIONS } from "../../constants";
import type { SchemaDefinition } from "../../../types";
import type { Consumer } from "../../consumer";
import type { Context } from "../../context";
import { BindTypeInformation, EncodingInformation } from "../base";
import { IntegerEncodingInformation, IntegerInformation } from "./number";
import { StringInformation } from "./string";
import { type DataScope, KeyBuilder } from "../../base";

export class EnumLayoutInformation extends BindTypeInformation {
    public override type: string = "enum";
    public readonly fields: Record<string, number> = Object.create(null);
    public readonly backing: IntegerInformation | null = null;
    public readonly kind: "numeric" | "literal" = "literal";
    public override consumeInternal(
        context: Context,
        consumer: Consumer,
    ): void {
        const enums = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.ENUM);
        const binary = consumer.getProperty<SchemaDefinition>(
            SCHEMA_KEYS.ENUM_VALUE,
        );
        let i = 0;

        for (const value of enums.getIterator()) {
            const index = i++;
            if (binary.hasValue() && binary.at(index).hasValue())
                this.fields[value.extract("string")] = binary
                    .at(index)
                    .extract("number");
            else this.fields[value.extract("string")] = index;
        }

        const enumType = consumer
            .getProperty<SchemaDefinition>(SCHEMA_KEYS.TYPE)
            .extract("string");

        if (enumType !== "string")
            throw new TypeError("Unknown enum type: " + enumType);

        const underlying = consumer
            .getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE)
            .extract("string");

        if (underlying === "object") {
            this.set("kind", "literal");
            this.set("backing", null);
        } else {
            this.set("kind", "numeric");
            let backing = new IntegerInformation("u32");
            backing.consume(context, consumer);
            this.set("backing", backing);
        }
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);

        if (scope === "layout") {
            Reflect.set(data, "enum_kind", this.kind);
            if (this.backing)
                Reflect.set(
                    data,
                    "backing_integer",
                    this.backing.interpretation,
                );
            Reflect.set(data, "enum", this.fields);
        }
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === "layout") builder.append(this.fields).append(this.kind);
        if (scope === "field" && this.backing)
            this.backing.getKey(builder, "field");
    }
    public override getEncoding(): EncodingInformation {
        return new EnumEncodingInformation(this);
    }
}

export class EnumEncodingInformation extends EncodingInformation {
    public readonly reinterpret: IntegerEncodingInformation | null;
    public readonly kind: "numeric" | "literal" = "literal";
    public readonly exhaustive: "non_exhaustive" | "exhaustive" = "exhaustive";
    public constructor(layout: EnumLayoutInformation) {
        super(layout);
        this.reinterpret = layout.backing
            ? new IntegerEncodingInformation(layout.backing, "enum")
            : null;
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);

        if (scope === "layout" || scope === "field") {
            Reflect.set(data, "exhaustive", this.exhaustive);
            Reflect.set(data, "enum_encoding", this.kind);

            if (this.kind === "literal")
                Reflect.set(
                    data,
                    "data_encoding",
                    StringInformation.default.createData("field"),
                );

            if (this.kind === "numeric" && this.reinterpret)
                Reflect.set(
                    data,
                    "data_encoding",
                    this.reinterpret.createData("field"),
                );
        }
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === "layout" || scope === "field") {
            builder.append(this.kind).append(this.exhaustive);
            if (this.reinterpret) this.reinterpret.getKey(builder, "field");
        }
    }
    public override consumeInternal(
        context: Context,
        consumer: Consumer,
    ): void {
        const options = consumer.getProperty<SchemaDefinition>(
            SCHEMA_KEYS.SERIALIZATION_OPTIONS,
        );

        if (options.hasValue()) {
            const enumAsValue = options.extractIncludes(
                "string",
                SERIALIZATION_OPTIONS.ENUM_AS_VALUE,
            );
            this.set("kind", enumAsValue ? "numeric" : "literal");
            if (enumAsValue) {
                const int = new IntegerInformation("i32");
                int.consume(context, consumer);
                const inte = int.getEncoding() as IntegerEncodingInformation;

                inte.consume(context, consumer);
                this.set("reinterpret", inte);
            }

            if (
                options.extractIncludes(
                    "string",
                    SERIALIZATION_OPTIONS.ALLOW_UNKNOWN_ENUM_VALUES,
                )
            ) {
                this.set("exhaustive", "non_exhaustive");
            }
        } else {
            consumer
                .getProperty<SchemaDefinition>(SCHEMA_KEYS.UNDERLYING_TYPE)
                .discard();
            this.set("reinterpret", null);
            this.set("kind", "literal");
        }
    }
}
