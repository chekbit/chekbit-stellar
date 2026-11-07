import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '../dtos/api-response.dto';

export function ApiSuccessResponse<T>(status: number, model?: Type<T>) {
  return applyDecorators(
    ApiResponse({
      status,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          model
            ? {
                properties: {
                  data: { $ref: getSchemaPath(model) },
                },
              }
            : {},
        ],
      },
    }),
  );
}
