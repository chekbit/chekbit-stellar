import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(public validationErrors: any) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY, // 422
        message: 'Validation failed',
        errors: validationErrors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
