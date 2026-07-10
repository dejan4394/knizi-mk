import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  ForbiddenException,
  Patch,
  Param,
  Req,
  Delete,
} from '@nestjs/common';
import { UsersService } from '../users/users.service'; // Увези го UsersService
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from './enums/user.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService, // Инјектирај го тука
  ) {}

  @Get()
  @Roles(UserRole.OWNER)
  async getTeamMembers(@Request() req: any) {
    const companyId = req.user?.companyId;
    return await this.usersService.findAllByCompany(companyId);
  }

  // 2. Креирај под-корисник во мојата компанија (Само за OWNER)
  @Post()
  @Roles(UserRole.OWNER)
  async addTeamMember(@Request() req: any, @Body() dto: any) {
    const userRole = req.user?.role || 'OWNER';
    if (userRole !== 'OWNER') {
      throw new ForbiddenException(
        'Само сопственикот на фирмата може да додава нови членови.',
      );
    }

    const companyId = req.user?.companyId || 1;
    return await this.usersService.createSubUser(companyId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  async updateSubUser(
    @Param('id') userId: number,
    @Req() req: any,
    @Body() body: any,
  ) {
    const companyId = req.user.companyId;
    return this.usersService.updateSubUser(companyId, Number(userId), body);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: number, @Req() req: AuthenticatedRequest) {
    return this.usersService.deleteSubUser(req.user.companyId, id);
  }
}
