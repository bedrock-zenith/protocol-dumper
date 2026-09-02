import { SCHEMA_KEYS } from "../../constants";
import type { SchemaDefinition, SchemaField } from "../../../types";
import type { Consumer } from "../../consumer";
import { Context } from "../../context";
import { BindTypeInformation, EncodingInformation } from "../base";
import { EnumLayoutInformation } from "./enum";
import {
    IntegerEncodingInformation,
    IntegerInformation,
    Utils,
} from "./number";
import { StringInformation } from "./string";
import { StructLayoutInformation } from "./struct";
import { OptionalInformation } from "./optional";
import { type DataScope, KeyBuilder } from "../../base";

interface UnionField {
    type: EncodingInformation;
    enum_literal: string;
}

export class UnionLayoutInformation extends BindTypeInformation {
    public readonly backing!: EnumLayoutInformation;
    public readonly fields: UnionField[] = [];
    public override type: string = "union";

    public static createBackingEnum(
        name: string,
        values: string[],
    ): EnumLayoutInformation {
        const backing = new EnumLayoutInformation(name);
        let index = 0;
        for (const value of values) backing.fields[value] = index++;
        return backing;
    }

    public override getEncoding(): EncodingInformation {
        return new UnionEncodingInformation(this);
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        if (scope === "layout") {
            Reflect.set(data, "fields", this.getFieldsData());

            // We don't need the layout or encoding here; it is only a reference.
            Reflect.set(
                data,
                "backing_enum",
                this.backing.createData("reference"),
            );
        }
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === "layout") {
            for (const field of this.fields) {
                builder.append(field.enum_literal);
                field.type.getKey(builder, "layout");
            }

            this.backing.getKey(builder, "layout");
        }
    }
    public override consumeInternal(
        context: Context,
        consumer: Consumer,
    ): void {
        const fields = this.consumeFields(context, consumer);
        this.resolveBackingEnum(fields, context);
    }

    protected consumeFields(
        context: Context,
        consumer: Consumer,
    ): EncodingInformation[] {
        const unionFields = consumer.getProperty<SchemaDefinition>(
            SCHEMA_KEYS.ONE_OF,
        );

        const fields: EncodingInformation[] = [];
        for (const field of unionFields.getIterator()) {
            const type = context.childWithEncoding(
                String(fields.length),
                field,
            );

            const ordinal = field.getProperty<SchemaField>(
                SCHEMA_KEYS.ORDINAL_INDEX,
            );
            if (ordinal.hasValue()) {
                const index = ordinal.extract("number");
                if (index !== fields.length)
                    throw new ReferenceError(
                        "ordinal index has to mach its true index, did mojang fckp?",
                    );
            }
            fields.push(type[0]);
        }

        return fields;
    }

    protected resolveBackingEnum(
        fields: EncodingInformation[],
        context: Context,
    ): void {
        const enumLayouts = fields.map((field) => {
            const layout = field.layout;
            if (!(layout instanceof StructLayoutInformation)) return undefined;

            const firstField = layout.fields[0];
            if (!firstField || !firstField.is_constant) return undefined;
            if (firstField.type.layout instanceof OptionalInformation)
                return undefined;
            if (!(firstField.type.layout instanceof EnumLayoutInformation))
                return undefined;

            const metadata = firstField.metadata as
                { constant_value?: unknown } | undefined;
            if (metadata?.constant_value === undefined) return undefined;
            return firstField.type.layout;
        });
        const firstEnum = enumLayouts[0];
        const backing =
            firstEnum &&
            enumLayouts.every(
                (enumLayout) =>
                    enumLayout === firstEnum &&
                    Object.keys(enumLayout.fields).length ===
                        Object.keys(firstEnum.fields).length,
            )
                ? firstEnum
                : undefined;

        const constants = fields.map((field) => {
            const layout = field.layout;
            if (!(layout instanceof StructLayoutInformation)) return undefined;
            const metadata = layout.fields[0]?.metadata as
                { constant_value?: unknown } | undefined;
            return metadata?.constant_value;
        });
        const hasConstants =
            constants.length > 0 &&
            constants.every((value) => value !== undefined) &&
            new Set(constants.map((value) => String(value))).size ===
                constants.length;

        const values = hasConstants
            ? constants.map((value) => String(value))
            : UnionLayoutInformation.removeCommonPrefix(
                  fields.map((field) => `${field.layout.name}`),
              );

        const resolvedBacking =
            backing ??
            UnionLayoutInformation.createBackingEnum(
                `${this.name} Control`.toSpacePascalCase().fixed(),
                values,
            );

        if (!backing) context.transformer.registerBindType(resolvedBacking);
        this.set("backing", resolvedBacking);
        for (const [index, type] of fields.entries()) {
            const field: UnionField = { type, enum_literal: values[index]! };
            this.fields.push(field);
        }
    }

    private getFieldsData(): object[] {
        return this.fields.map((field) => ({
            type: field.type.createData("field"),
            enum_literal: field.enum_literal,
        }));
    }

    private static removeCommonPrefix(strings: string[]): string[] {
        if (strings.length === 0) return [];

        // Find the longest common prefix
        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (!strings[i]!.startsWith(prefix!)) {
                prefix = prefix!.slice(0, -1);
                if (prefix === "") break;
            }
        }

        // Strip the common prefix from all strings
        return prefix ? strings.map((s) => s.slice(prefix.length)) : strings;
    }
}

export class UnionEncodingInformation extends EncodingInformation {
    public control: EncodingInformation;
    public constructor(layout: UnionLayoutInformation) {
        super(layout);
        this.control = new IntegerEncodingInformation(
            new IntegerInformation("u32"),
            "union",
        );
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);
        if (scope === "layout" || scope === "field") {
            const encoding = this.control.createData("field");
            Reflect.set(data, "enum_encoding", encoding);

            Reflect.set(
                data,
                "control_encoding",
                this.control.createData("field"),
            );
        }
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);
        if (scope === "layout" || scope === "field")
            this.control.getKey(builder, "field");
    }
    protected createControlEncoding(type: string): EncodingInformation {
        if (type === "string") return new StringInformation().getEncoding();
        const int = Utils.integer(type);
        return new IntegerEncodingInformation(
            new IntegerInformation(int),
            "union",
        );
    }
    protected override consumeInternal(
        context: Context,
        consumer: Consumer,
    ): void {
        const controlType =
            consumer
                .getProperty<SchemaDefinition>("x-control-value-type")
                .extractOptional("string") ?? "uint32";
        this.set("control", this.createControlEncoding(controlType));
    }
}
