import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
// import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { RolesGuard } from './guards/roles.guard';
// import { Roles } from './decorators/roles.decorator';
// import { UserRole } from 'src/users/enums/user.enum';

// 1. Дефинираме што точно содржи токенот на логираниот корисник
// interface AuthenticatedUser {
//   userId: number;
//   email: string;
//   role: UserRole; // Го користиме твојот енум за улоги
//   companyId: number;
// }

// 2. Го прошируваме Express Request за да го вклучи безбедниот корисник
// interface AuthenticatedRequest extends Request {
//   user: AuthenticatedUser;
// }

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
