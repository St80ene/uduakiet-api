import { Controller } from '@nestjs/common';
import { ReportsService } from './reports.service';
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { UserRole } from '../../common/enum/user_role.enum';

@Controller('reports')
// @UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  // @Post()
  // create(@Body() createReportDto: CreateReportDto) {
  //   // return this.reportsService.create(createReportDto);
  // }
}
