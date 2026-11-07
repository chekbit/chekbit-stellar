import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { DataSource, Not } from 'typeorm';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entity, property, ignoreIdField, ignoreIdValue] = args.constraints;

    if (!entity || !property || !value) return true;

    try {
      const repo = this.dataSource.getRepository(entity);

      const where: any = { [property]: value };

      // handle "ignore id" for update
      if (ignoreIdField && ignoreIdValue) {
        where[ignoreIdField] = Not(ignoreIdValue);
      }

      const existing = await repo.findOne({ where });
      return !existing;
    } catch (err) {
      console.error('IsUnique error:', err);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [, property] = args.constraints;
    return `${property} must be unique`;
  }
}
