import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Опционално: Откоментирај ако сакаш рутата да биде заштитена со JWT

@Controller('clients')
@UseGuards(JwtAuthGuard) // Ако сакаш само најавени корисници да ја користат
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async create(
    @Body() createClientDto: Partial<Client>,
    @Req() req: AuthenticatedRequest,
  ): Promise<Client> {
    return await this.clientsService.create(createClientDto, req.user.companyId);
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest): Promise<Client[]> {
    const companyId = req.user.companyId;

    return await this.clientsService.findAll(companyId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: Partial<Client>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.clientsService.update(id, updateClientDto, req.user.companyId);
  }
}
