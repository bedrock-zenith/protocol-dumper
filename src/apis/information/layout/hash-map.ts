import { LAYOUT_KEYS, SCHEMA_KEYS } from '../../constants';
import type { SchemaDefinition } from '../../../types';
import type { Consumer } from '../../consumer';
import { Context } from '../../context';
import { EncodingInformation, PrimitiveTypeInformation } from '../base';
import { IntegerEncodingInformation, IntegerInformation } from './number';
import { StringEncodingInformation, StringInformation } from './string';
import { type DataScope, KeyBuilder } from '../../base';

export class MapLayoutInformation extends PrimitiveTypeInformation {
    public readonly element!: EncodingInformation;
    public readonly key!: EncodingInformation;
    public constructor() {
        super('map');
    }
    public override getEncoding(): EncodingInformation {
        return new MapEncodingInformation(this);
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);

        if (scope === 'layout' || scope === 'field') {
            Reflect.set(data, 'key_type', this.key.createData('field'));

            Reflect.set(data, 'value_type', this.element.createData('field'));
        }
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        builder.append(LAYOUT_KEYS.MAP);

        if (scope === 'layout') {
            this.key.getKey(builder, 'layout');

            this.element.getKey(builder, 'layout');
        }

        if (scope === 'field' || scope === 'reference') {
            this.key.getKey(builder, 'field');

            this.element.getKey(builder, 'field');
        }
    }
    protected override consumeInternal(context: Context, consumer: Consumer): void {
        const additionalProperties = consumer.getProperty<SchemaDefinition>(
            SCHEMA_KEYS.ADDITIONAL_PROPERTIES
        );
        const isImplicit = this.isImplicit(additionalProperties);

        if (isImplicit) {
            const element = context.childWithEncoding('map.element', additionalProperties);
            this.set('element', element[0]);
        } else {
            const element = this.getValueChildWithEncodingExplicit(context, additionalProperties);
            this.set('element', element);
        }

        if (isImplicit) {
            const propertyNames = consumer.getProperty<SchemaDefinition>(SCHEMA_KEYS.PROPERTY_NAMES);

            let encoding: EncodingInformation;
            if (propertyNames.hasValue()) {
                const data = context.childWithEncoding('map.key', propertyNames);
                encoding = data[0];
            } else encoding = new StringEncodingInformation(new StringInformation());

            this.set('key', encoding);
        } else {
            const encoding = this.getKeyChildWithEncodingExplicit(context, additionalProperties);
            this.set('key', encoding);
        }

        if (
            additionalProperties.hasProperty<SchemaDefinition>('minimum') ||
            additionalProperties.hasProperty<SchemaDefinition>('maximum')
        ) {
            const minimum = additionalProperties.getProperty<SchemaDefinition>('minimum');
            const maximum = additionalProperties.getProperty<SchemaDefinition>('maximum');

            if (minimum.hasValue())
                Reflect.set(this.element.metadata, 'min_value', minimum.extract('number'));

            if (maximum.hasValue())
                Reflect.set(this.element.metadata, 'max_value', maximum.extract('number'));
        }

        const maxProperties = consumer.getProperty<SchemaDefinition>('maxProperties');
        if (maxProperties.hasValue()) {
            Reflect.set(this.metadata, 'max_properties', maxProperties.extract('number'));
        }
    }
    protected isImplicit(additionalProperties: Consumer): boolean {
        const type = additionalProperties.getProperty<SchemaDefinition>('type');
        if (type.hasValue())
            if (type.extract('string') === 'object') {
                const properties = additionalProperties.getProperty<SchemaDefinition>('properties');
                if (properties.hasValue()) {
                    const key = properties.getProperty('key');
                    return key.hasProperty(SCHEMA_KEYS.ORDINAL_INDEX);
                }
                return true;
            }

        return true;
    }
    protected getValueChildWithEncodingExplicit(
        context: Context,
        additionalProperties: Consumer
    ): EncodingInformation {
        const property = additionalProperties.getProperty('properties');
        const child = property.getProperty('value');
        return context.childWithEncoding('map.element', child)[0];
    }
    protected getKeyChildWithEncodingExplicit(
        context: Context,
        additionalProperties: Consumer
    ): EncodingInformation {
        const property = additionalProperties.getProperty('properties');
        const child = property.getProperty('key');
        return context.childWithEncoding('map.key', child)[0];
    }
}

export class MapEncodingInformation extends EncodingInformation {
    public readonly length: IntegerEncodingInformation = new IntegerEncodingInformation(
        new IntegerInformation('u32'),
        'array'
    );
    public constructor(layout: MapLayoutInformation) {
        super(layout);
    }
    public override getData(data: object, scope: DataScope): void {
        super.getData(data, scope);

        if (scope === 'layout' || scope === 'field')
            Reflect.set(data, 'length_encoding', this.length.createData('field'));
    }
    public override getKey(builder: KeyBuilder, scope: DataScope): void {
        super.getKey(builder, scope);

        if (scope === 'layout' || scope === 'field') {
            this.length.getKey(builder, 'field');

            builder.append(LAYOUT_KEYS.MAP);
        }
    }
    protected override consumeInternal(context: Context, consumer: Consumer): void {
        this.length.consume(context, consumer);
        this.length.set('metadata', {});
    }
}
