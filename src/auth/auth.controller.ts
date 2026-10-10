import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiResponse } from '../common/utils/response.utils';
import { User } from '../resources/users/entities/user.entity';
import { JwtRefreshGuard } from './guards/jwt_refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') id: string): Promise<ApiResponse<User>> {
    return this.authService.me(id);
  }

  @Public()
  @Post('/login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: Request) {
    // Passport attaches the strategy output to req.user
    const { userId, refreshToken } = req.user as {
      userId: number;
      refreshToken: string;
    };
    return this.authService.refresh(userId.toString(), refreshToken);
  }

  // @Public()
  // @Post('forgot-password')
  // forgotPassword(@Body() dto: { email: string }) {
  //   return this.authService.forgotPassword(dto);
  // }

  // @Public()
  // @Post('reset-password')
  // passwordReset(@Body() dto: ChangePasswordDto) {
  //   return this.authService.passwordReset(dto);
  // }

  // @Post('change-password')
  // changePassword(
  //   @CurrentUser('id') userId: string,
  //   @Body() dto: ChangePasswordDto,
  // ): Promise<ApiResponse<string>> {
  //   return this.authService.changePassword(userId, dto);
  // }
}
