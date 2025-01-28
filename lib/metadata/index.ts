import { oas31 } from 'openapi3-ts';

export enum MiddlwareMetaKeys {
  requestBody = 'request-body',
  pathParams = 'path-params',
  query = 'query',
  files = 'files',
}

export interface OpenApiMetadata {
  schema?: oas31.SchemaObject | oas31.ReferenceObject;
}
