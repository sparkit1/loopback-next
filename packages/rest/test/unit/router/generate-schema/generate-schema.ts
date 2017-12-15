import {
  convertToSchemaObject,
  generateSchema,
  getFilePaths,
  getSchemaNames,
} from '../../../../src/router/generate-schema';
import {expect} from '@loopback/testlab';
import {Definition} from 'typescript-json-schema';
import {
  SchemaObject,
  createEmptyApiSpec,
  OpenApiSpec,
} from '@loopback/openapi-spec';
import {resolve} from 'path';

describe('convertToSchemaObject', () => {
  describe('valid', () => {
    it('does nothing when given an empty object', () => {
      expect({}).to.eql({});
    });
    const typeDef = {type: ['string', 'number']};
    const expectedType = {type: 'string'};
    propertyConversionTest('type', typeDef, expectedType);

    const allOfDef: Definition = {
      // type: 'object',
      allOf: [typeDef, typeDef],
    };
    const expectedAllOf: SchemaObject = {
      // type: 'object',
      allOf: [expectedType, expectedType],
    };
    propertyConversionTest('allOf', allOfDef, expectedAllOf);

    const propertyDef: Definition = {
      type: 'object',
      properties: {
        foo: typeDef,
      },
    };

    const expectedProperties: SchemaObject = {
      type: 'object',
      properties: {
        foo: expectedType,
      },
    };
    propertyConversionTest('properties', propertyDef, expectedProperties);

    const additionalDef: Definition = {
      type: 'object',
      additionalProperties: typeDef,
    };
    const expectedAdditional: SchemaObject = {
      type: 'object',
      additionalProperties: expectedType,
    };
    propertyConversionTest(
      'additionalProperties',
      additionalDef,
      expectedAdditional,
    );

    const itemsDef: Definition = {
      type: 'array',
      items: typeDef,
    };
    const expectedItems: SchemaObject = {
      type: 'array',
      items: expectedType,
    };
    propertyConversionTest('items', itemsDef, expectedItems);

    it('retains given properties in the conversion', () => {
      const inputDef: Definition = {
        title: 'foo',
        type: 'object',
      };
      const expectedDef: SchemaObject = {
        title: 'foo',
        type: 'object',
      };
      expect(convertToSchemaObject(inputDef)).to.eql(expectedDef);
    });
  });
  describe('invalid path', () => {
    it('throws if type is an array and items is missing', () => {
      expect.throws(
        () => {
          convertToSchemaObject({type: 'array'});
        },
        Error,
        '"items" property must be present if "type" is an array',
      );
    });
  });

  // Helper function to check conversion of JSON Schema properties
  // to Swagger versions
  function propertyConversionTest(
    name: string,
    property: Object,
    expected: Object,
  ) {
    it(name, () => {
      expect(convertToSchemaObject(property)).to.eql(expected);
    });
  }
});

describe('getFilePaths and getSchemaNames', () => {
  describe('if the directory does not exist', () => {
    it('getFilePaths returns empty array with empty directory', () => {
      const pathToModel = 'non/existent/path/to/non/existent/models';
      const filePaths = getFilePaths(pathToModel);
      expect(filePaths).to.eql([]);
    });
  });
  describe('with empty directory', () => {
    const pathToModel = resolve(
      'test/unit/router/generate-schema/without-models/models',
    );
    it('getFilePaths returns empty array with empty directory', () => {
      const filePaths = getFilePaths(pathToModel);
      expect(filePaths).to.eql([]);
    });
    it('getSchemaNames returns empty array with empty input', () => {
      const schemaNames = getSchemaNames([]);
      expect(schemaNames).to.eql([]);
    });
  });
  describe('with non-empty directory', () => {
    let filePaths: string[];
    const pathToModel = resolve(
      'test/unit/router/generate-schema/with-models/models',
    );
    it('getFilePaths returns correct file paths', () => {
      filePaths = getFilePaths(pathToModel);
      expect(filePaths).to.containEql(resolve(pathToModel, 'foo.model.ts'));
      expect(filePaths).to.containEql(resolve(pathToModel, 'bar.model.ts'));
      expect(filePaths).to.containEql(resolve(pathToModel, 'index.ts'));
      return filePaths;
    });
    it('getSchemaNames returns correct model names', () => {
      const modelNames = getSchemaNames(filePaths);
      expect(modelNames).to.containEql('Foo');
      expect(modelNames).to.containEql('Bar');
      expect(modelNames).to.not.containEql('index');
    });
  });
});
describe('generateSchema', () => {
  describe('with no models defined', () => {
    it('empty API spec remains unchanged', () => {
      const pathToModel = resolve(
        'test/unit/router/generate-schema/without-models/models',
      );
      const input: OpenApiSpec = createEmptyApiSpec();
      const expected: OpenApiSpec = createEmptyApiSpec();
      const result = generateSchema(input, pathToModel);
      expect(result).to.eql(expected);
    });
  });
  describe('with models defined', () => {
    it('properly generates the spec', () => {
      const pathToModel = resolve(
        'test/unit/router/generate-schema/with-models/models',
      );
      const input: OpenApiSpec = createEmptyApiSpec();
      const expected: OpenApiSpec = createEmptyApiSpec();
      const schemaVersion = 'http://json-schema.org/draft-04/schema#';
      expected.definitions = {
        Foo: {
          $schema: schemaVersion,
          properties: {
            fee: {
              type: 'string',
            },
            fi: {
              type: 'number',
            },
            fo: {
              items: {
                type: 'string',
              },
              type: 'array',
            },
          },
          required: ['fee', 'fo'],
          type: 'object',
        },
        Bar: {
          $schema: schemaVersion,
          properties: {
            bee: {
              type: 'string',
            },
          },
          required: ['bee'],
          type: 'object',
        },
      };
      generateSchema(input, pathToModel);
      expect(input).to.deepEqual(expected);
    });
  });
});
