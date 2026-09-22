import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RefreshTokenDto } from './dto/refresh_token.dto';
import { ChangePasswordDto } from './dto/password.dto';
import { ApiResponse } from '../common/utils/response.utils';
import { User } from '../resources/users/entities/user.entity';

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

  @Post('refresh')
  refresh(@Body() { refreshToken }: RefreshTokenDto) {
    console.log({ refreshToken });
    return this.authService.refresh(refreshToken);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponse<string>> {
    return this.authService.changePassword(userId, dto);
  }
}
