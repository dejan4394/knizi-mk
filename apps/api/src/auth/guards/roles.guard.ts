import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/enums/user.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Провери кои улоги се дефинирани како дозволени за рутата/контролерот
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Ако нема дефинирано улоги, рутата е јавна (или бара само логин)
    if (!requiredRoles) {
      return true;
    }

    // 2. Земи го корисникот од реквестот (кој претходно го поставил AuthGuard-от)
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Пристапот е одбиен. Немате валидна корисничка улога.',
      );
    }

    // 3. Провери дали улогата на корисникот се совпаѓа со дозволените
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Немате дозвола за извршување на оваа акција.',
      );
    }

    return true;
  }
}
