import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthTokenResponse, UserResponse } from './user.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/signup → 201 User(passwordHash 제외). 중복 이메일 409. */
  @Post('signup')
  @HttpCode(201)
  signup(@Body() dto: SignupDto): Promise<UserResponse> {
    return this.authService.signup(dto);
  }

  /** POST /auth/login → 200 { accessToken, tokenType, expiresIn, user }. 자격증명 불일치 401. */
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }

  /** GET /auth/me → 200 User. 토큰 없음/무효 401. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }
}
