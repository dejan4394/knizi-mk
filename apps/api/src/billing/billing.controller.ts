import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user.enum';
import { CardDetailsDto } from './dto/card-details.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // Преглед на тековната претплата - достапно за сите најавени корисници.
  @Get()
  async getBilling(@Request() req: AuthenticatedRequest) {
    return this.billingService.getBillingOverview(req.user.companyId);
  }

  // Надградба/симнување на план - само сопственикот менува претплата.
  // При надградба се праќаат податоци од картичка (се токенизираат во банката).
  @Post('upgrade')
  @Roles(UserRole.OWNER)
  async upgrade(
    @Request() req: AuthenticatedRequest,
    @Body() card: CardDetailsDto,
  ) {
    return this.billingService.upgradeToPro(req.user.companyId, card);
  }

  @Post('downgrade')
  @Roles(UserRole.OWNER)
  async downgrade(@Request() req: AuthenticatedRequest) {
    return this.billingService.downgradeToFree(req.user.companyId);
  }
}
