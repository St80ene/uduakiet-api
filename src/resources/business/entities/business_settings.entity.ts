import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class BusinessSettingsEntity {
  @IsString()
  @IsOptional()
  theme_color?: string;

  @IsBoolean()
  @IsOptional()
  enable_notifications?: boolean;

  @IsString()
  @IsOptional()
  timezone?: string;

  [key: string]: unknown; // Allow additional properties
}
