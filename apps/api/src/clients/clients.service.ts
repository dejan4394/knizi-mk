import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  async update(id: number, updateClientDto: Partial<Client>): Promise<Client> {
    // 1. Провери дали клиентот со тоа ID воопшто постои во базата
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Клиентот со ID ${id} не е пронајден.`);
    }

    // 2. Безбедносна проверка за Единствен Даночен Број (ЕДБ)
    // Ако се менува ЕДБ-то, провери да не веќе постои друга фирма со тој број
    if (updateClientDto.edb && updateClientDto.edb !== client.edb) {
      const edbExists = await this.clientRepository.findOne({
        where: { edb: updateClientDto.edb },
      });
      if (edbExists) {
        throw new BadRequestException(
          'Веќе постои друг комитент со тој ЕДБ број.',
        );
      }
    }

    // 3. Спојување на новите податоци врз старите
    Object.assign(client, updateClientDto);

    // 4. Зачувување во базата на податоци
    return await this.clientRepository.save(client);
  }
}
