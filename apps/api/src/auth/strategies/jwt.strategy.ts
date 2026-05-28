import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Го бара токенот во Authorization: Bearer <TOKEN>
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRET_KEY_2026',
    });
  }

  // Оваа функција автоматски се повикува кога токенот е валиден
  validate(payload: {
    sub: number;
    email: string;
    role: string;
    companyId: number;
  }) {
    // Враќаме објект кој ќе биде достапен во req.user во секој заштитен контролер
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    };
  }
}
