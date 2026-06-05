import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Put,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Опционално: Откоментирај ако сакаш рутата да биде заштитена со JWT

@Controller('clients')
@UseGuards(JwtAuthGuard) // Ако сакаш само најавени корисници да ја користат
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async create(@Body() createClientDto: Partial<Client>): Promise<Client> {
    return await this.clientsService.create(createClientDto);
  }

  @Get()
  async findAll(): Promise<Client[]> {
    return await this.clientsService.findAll();
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: Partial<Client>,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }
}
