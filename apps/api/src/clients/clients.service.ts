import { Injectable, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  // 1. Креирање нов клиент со заштита од дупликат ЕДБ
  async create(data: Partial<Client>): Promise<Client> {
    const existingClient = await this.clientRepository.findOne({
      where: { edb: data.edb },
    });
    if (existingClient) {
      throw new ConflictException(
        'Клиент со таков Единствен Даночен Број (ЕДБ) веќе постои!',
      );
    }

    const client = this.clientRepository.create(data);
    return await this.clientRepository.save(client);
  }

  // 2. Листање на сите клиенти подредени по име
  async findAll(): Promise<Client[]> {
    return await this.clientRepository.find({
      order: { name: 'ASC' },
    });
  }
}
