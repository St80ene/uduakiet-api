import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { OutboxEventType } from '../../outbox/entities/outbox_events.entity';

export class CreateNotificationDto {
  @IsUUID('4')
  business_id!: string;

  @IsUUID('4')
  recipient_id?: string;

  @IsUUID('4')
  source_event_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type!: OutboxEventType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  message!: string;

  @IsObject()
  data!: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;
}
