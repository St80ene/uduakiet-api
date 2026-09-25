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

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  create(
    @Body() createBusinessDto: CreateBusinessDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.businessesService.create(createBusinessDto, file);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.businessesService.update(id, updateBusinessDto, file);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessesService.remove(id);
  }
}
