// src/common/pipes/validation.pipe.ts
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationException } from '../exceptions/validation.exception';

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    if (value == null || value == undefined) {
      throw new BadRequestException('Request body cannot be empty');
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, { whitelist: true });

    if (errors.length > 0) {
      const formattedErrors: Record<string, string[]> = {};
      errors.forEach((err) => {
        if (err.constraints) {
          formattedErrors[err.property] = Object.values(err.constraints);
        }
      });
      throw new ValidationException(formattedErrors);
    }

    return value;
  }

  //
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
