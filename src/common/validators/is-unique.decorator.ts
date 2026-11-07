import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsUniqueConstraint } from './is-unique.validator';

export function IsUnique(
  entity: Function,
  property: string,
  ignoreIdField?: string,
  ignoreIdValue?: any,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [entity, property, ignoreIdField, ignoreIdValue],
      validator: IsUniqueConstraint,
    });
  };
}
