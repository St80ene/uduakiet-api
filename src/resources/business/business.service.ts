import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { Business } from './entities/business.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  CloudinaryService,
  CloudinaryImage,
} from '../../common/utils/helpers/cloudinary/cloudinary.service';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create a new business.
   *
   * Checks business uniqueness, uploads the optional logo,
   * persists the business profile and rolls back the uploaded
   * asset if database persistence fails.
   */
  async create(
    createBusinessDto: CreateBusinessDto,
    file?: Express.Multer.File,
  ): Promise<ApiResponse<Business>> {
    const { registration_number, tax_identification_number } =
      createBusinessDto;

    /**
     * Check identifiers that should be unique.
     *
     * Email is intentionally not used as a uniqueness constraint
     * because multiple businesses may legitimately share an email.
     */
    const existingBusiness = await this.businessRepository.findOne({
      where: [
        { tax_identification_number },
        ...(registration_number ? [{ registration_number }] : []),
      ],
    });

    if (existingBusiness) {
      if (
        registration_number &&
        existingBusiness.registration_number === registration_number
      ) {
        throw new ConflictException(
          `Registration number '${registration_number}' is already in use.`,
        );
      }
    }

    let businessLogo: CloudinaryImage | null = null;

    try {
      /**
       * Upload business logo before creating the database record.
       */
      if (file) {
        const uploadedAsset = await this.cloudinaryService.uploadImage(
          file,
          'branding',
        );

        businessLogo = {
          url: uploadedAsset.url,
          publicId: uploadedAsset.publicId,
        };
      }

      const business = this.businessRepository.create({
        legal_name: createBusinessDto.legal_name,
        display_name: createBusinessDto.display_name,

        registration_number: createBusinessDto.registration_number,

        tax_identification_number: createBusinessDto.tax_identification_number,

        business_type: createBusinessDto.business_type,

        email: createBusinessDto.email,
        phone_number: createBusinessDto.phone_number,
        website: createBusinessDto.website,

        address_line_1: createBusinessDto.address_line_1,
        address_line_2: createBusinessDto.address_line_2,
        city: createBusinessDto.city,
        state: createBusinessDto.state,
        country: createBusinessDto.country,
        postal_code: createBusinessDto.postal_code,

        currency: createBusinessDto.currency,
        timezone: createBusinessDto.timezone,
        locale: createBusinessDto.locale,

        tax_settings: createBusinessDto.tax_settings,
        settings: createBusinessDto.settings,

        logo: businessLogo,
      });

      const savedBusiness = await this.businessRepository.save(business);

      return successResponse('Business registered successfully', savedBusiness);
    } catch (error) {
      /**
       * Don't convert intentional HTTP exceptions into 500 errors.
       */
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      /**
       * Roll back Cloudinary upload if database creation fails.
       */
      if (businessLogo?.publicId) {
        try {
          await this.cloudinaryService.deleteImage(businessLogo.publicId);
        } catch (rollbackError) {
          this.logger.warn(
            `Failed to rollback business logo (${businessLogo.publicId}): ${
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError)
            }`,
          );
        }
      }

      this.logger.error(
        `Failed to create business: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new InternalServerErrorException('Failed to register business.');
    }
  }

  /**
   * Retrieve a business profile by ID.
   */
  async findOne(id: string): Promise<ApiResponse<Business>> {
    const business = await this.businessRepository.findOne({
      where: { id },
    });

    if (!business) {
      throw new NotFoundException('Business profile not found.');
    }

    return successResponse('Business profile retrieved', business);
  }

  /**
   * Update a business profile.
   *
   * If a new logo is provided:
   *
   * 1. Upload the new logo.
   * 2. Save the database changes.
   * 3. Delete the previous logo.
   *
   * If database persistence fails, the newly uploaded logo
   * is removed to prevent orphaned Cloudinary assets.
   */
  async update(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
    file?: Express.Multer.File,
  ): Promise<ApiResponse<Business>> {
    const business = await this.businessRepository.findOne({
      where: { id },
    });

    if (!business) {
      throw new NotFoundException('Business not found.');
    }

    /**
     * Check uniqueness only when one of the unique identifiers
     * is being changed.
     */
    await this.validateUniqueFields(id, updateBusinessDto.registration_number);

    /**
     * No logo change.
     */
    if (!file) {
      try {
        this.businessRepository.merge(business, updateBusinessDto);

        const savedBusiness = await this.businessRepository.save(business);

        return successResponse(
          'Business profile updated successfully',
          savedBusiness,
        );
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error;
        }

        this.logger.error(
          `Failed to update business ${id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        throw new InternalServerErrorException(
          'Failed to update business profile.',
        );
      }
    }

    const oldLogoPublicId = business.logo?.publicId;

    let uploadedAsset: CloudinaryImage | null = null;

    /**
     * STEP 1
     *
     * Upload the new logo first.
     */
    try {
      const asset = await this.cloudinaryService.uploadImage(file, 'branding');

      uploadedAsset = {
        url: asset.url,
        publicId: asset.publicId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload business logo for ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new BadRequestException('Failed to upload business logo.');
    }

    /**
     * STEP 2
     *
     * Update the database.
     */
    try {
      this.businessRepository.merge(business, updateBusinessDto);

      business.logo = uploadedAsset;

      const savedBusiness = await this.businessRepository.save(business);

      /**
       * STEP 3
       *
       * Delete old logo only after the database update
       * has succeeded.
       */
      if (oldLogoPublicId && oldLogoPublicId !== uploadedAsset.publicId) {
        try {
          await this.cloudinaryService.deleteImage(oldLogoPublicId);
        } catch (error) {
          this.logger.warn(
            `Failed to delete previous business logo (${oldLogoPublicId}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      return successResponse(
        'Business profile updated successfully',
        savedBusiness,
      );
    } catch (error) {
      /**
       * Roll back the newly uploaded logo.
       */
      if (uploadedAsset?.publicId) {
        try {
          await this.cloudinaryService.deleteImage(uploadedAsset.publicId);
        } catch (rollbackError) {
          this.logger.warn(
            `Failed to rollback uploaded business logo (${uploadedAsset.publicId}): ${
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError)
            }`,
          );
        }
      }

      this.logger.error(
        `Failed to update business ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new InternalServerErrorException(
        'Failed to update business profile.',
      );
    }
  }

  /**
   * Soft-delete a business and remove its branding asset.
   */
  async remove(id: string): Promise<ApiResponse<null>> {
    const business = await this.businessRepository.findOne({
      where: { id },
    });

    if (!business) {
      throw new NotFoundException('Business profile not found.');
    }

    try {
      /**
       * Remove the Cloudinary logo if one exists.
       */
      if (business.logo?.publicId) {
        try {
          await this.cloudinaryService.deleteImage(business.logo.publicId);
        } catch (error) {
          this.logger.warn(
            `Failed to delete business logo (${business.logo.publicId}): ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      /**
       * Soft-delete the business.
       *
       * Related records should be handled according to
       * their own business lifecycle strategy.
       */
      await this.businessRepository.softDelete({
        id: business.id,
      });

      return successResponse('Business profile deleted successfully', null);
    } catch (error) {
      this.logger.error(
        `Failed to delete business ${business.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new InternalServerErrorException(
        'Failed to delete business profile.',
      );
    }
  }

  /**
   * Validate fields that must be unique across businesses.
   *
   * The current business is excluded when updating.
   */
  private async validateUniqueFields(
    businessId: string,
    registration_number?: string,
  ): Promise<void> {
    const conditions: FindOptionsWhere<Business>[] = [];

    if (registration_number) {
      conditions.push({ registration_number });
    }

    const existingBusiness = await this.businessRepository.findOne({
      where: conditions,
    });

    if (existingBusiness && existingBusiness.id !== businessId) {
      if (
        registration_number &&
        existingBusiness.registration_number === registration_number
      ) {
        throw new ConflictException(
          `Registration number '${registration_number}' is already in use.`,
        );
      }
    }
  }
}
