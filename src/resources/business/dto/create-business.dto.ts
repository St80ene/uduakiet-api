import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

import { BusinessSettingsEntity } from '../entities/business_settings.entity';
import { CloudinaryImage } from '../../../common/utils/helpers/cloudinary/cloudinary.service';
import {
  NormalizeString,
  NormalizeEmail,
} from '../../../common/utils/helpers/formatters';

export class CreateBusinessDto {
  // ==========================================================
  // IDENTITY
  // ==========================================================

  @IsString()
  @NormalizeString()
  @MaxLength(255)
  legal_name!: string;

  @IsString()
  @NormalizeString()
  @MaxLength(255)
  display_name!: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(100)
  registration_number?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(100)
  tax_identification_number?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(50)
  business_type?: string;

  // ==========================================================
  // CONTACT
  // ==========================================================

  @IsOptional()
  @IsEmail()
  @NormalizeEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone_number?: string;

  @IsOptional()
  @IsUrl()
  @NormalizeString()
  @MaxLength(255)
  website?: string;

  // ==========================================================
  // ADDRESS
  // ==========================================================

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(255)
  address_line_1?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(255)
  address_line_2?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string;

  // ==========================================================
  // BRANDING
  // ==========================================================

  @IsOptional()
  logo?: CloudinaryImage | null;

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  @IsOptional()
  @IsString()
  @NormalizeString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @NormalizeString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsObject()
  tax_settings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  settings?: BusinessSettingsEntity;
}
