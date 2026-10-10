import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BusinessesService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';
import { UserPermission } from '../../common/enum/user_permission.enum';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Roles([UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.BUSINESS_CREATE])
  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  create(
    @Body() createBusinessDto: CreateBusinessDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.businessesService.create(createBusinessDto, file);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.BUSINESS_SETTINGS_READ])
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessesService.findOne(id);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.BUSINESS_SETTINGS_UPDATE])
  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.businessesService.update(id, updateBusinessDto, file);
  }

  @Roles([UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.BUSINESS_SETTINGS_DELETE])
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessesService.remove(id);
  }
}
