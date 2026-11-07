import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  statusCode: number;
  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  data: T;
}
