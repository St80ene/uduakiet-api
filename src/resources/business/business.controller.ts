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
  UseGuards,
} from '@nestjs/common';
import { BusinessesService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';

@Controller('businesses')
@UseGuards(RolesGuard) // Apply the RolesGuard to all routes in this controller
export class BusinessController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Roles([UserRole.SUPER_ADMIN])
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
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessesService.findOne(id);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
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
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessesService.remove(id);
  }
}
