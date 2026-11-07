import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a property is a valid uploaded file (e.g. Express.Multer.File).
 * Supports MIME type and size validation.
 */
export function IsFile(
  allowedMimeTypes?: string[],
  maxSize: number = 5 * 1024 * 1024, // 5 MB default
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFile',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return false;

          // Check that it's a Multer file object
          const isMulterFile =
            typeof value === 'object' &&
            'originalname' in value &&
            'mimetype' in value &&
            'size' in value;

          if (!isMulterFile) return false;

          // Validate MIME type
          if (
            allowedMimeTypes?.length &&
            !allowedMimeTypes.includes(value.mimetype)
          ) {
            return false;
          }

          // Validate file size
          if (value.size > maxSize) return false;

          return true;
        },

        defaultMessage(args?: ValidationArguments): string {
          const baseMessage = `${args?.property ?? 'File'} must be a valid file${
            allowedMimeTypes?.length
              ? ` of type: ${allowedMimeTypes.join(', ')}`
              : ''
          } and less than ${Math.round(maxSize / (1024 * 1024))}MB`;

          return typeof validationOptions?.message === 'string'
            ? validationOptions.message
            : baseMessage;
        },
      },
    });
  };
}
