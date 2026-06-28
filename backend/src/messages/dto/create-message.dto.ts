import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  recipientId?: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
