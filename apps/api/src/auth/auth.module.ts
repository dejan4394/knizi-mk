import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'SUPER_SECRET_KEY_2026', // Во продукција ова оди во .env фајл
      signOptions: { expiresIn: '1d' }, // Токенот трае 1 ден
    }),
    TypeOrmModule.forFeature([User, Company]), // Потребни ни се за регистрација и проверка
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [PassportModule, JwtStrategy, AuthService], // Ги експортираме за да ги користат други модули
})
export class AuthModule {}
