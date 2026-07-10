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

  // 1. Креирање нов клиент со заштита од дупликат ЕДБ (во рамките на компанијата)
  async create(data: Partial<Client>, companyId: number): Promise<Client> {
    const existingClient = await this.clientRepository.findOne({
      where: { edb: data.edb, companyId },
    });
    if (existingClient) {
      throw new ConflictException(
        'Клиент со таков Единствен Даночен Број (ЕДБ) веќе постои!',
      );
    }

    // companyId се зема од токенот, не од телото на барањето
    const client = this.clientRepository.create({ ...data, companyId });
    return await this.clientRepository.save(client);
  }

  // 2. Листање на сите клиенти подредени по име
  async findAll(companyId: number): Promise<Client[]> {
    return await this.clientRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async update(
    id: number,
    updateClientDto: Partial<Client>,
    companyId: number,
  ): Promise<Client> {
    // 1. Провери дали клиентот со тоа ID постои и ѝ припаѓа на компанијата
    const client = await this.clientRepository.findOne({
      where: { id, companyId },
    });
    if (!client) {
      throw new NotFoundException(`Клиентот со ID ${id} не е пронајден.`);
    }

    // 2. Безбедносна проверка за Единствен Даночен Број (ЕДБ)
    // Ако се менува ЕДБ-то, провери да не веќе постои друг комитент во оваа фирма со тој број
    if (updateClientDto.edb && updateClientDto.edb !== client.edb) {
      const edbExists = await this.clientRepository.findOne({
        where: { edb: updateClientDto.edb, companyId },
      });
      if (edbExists) {
        throw new BadRequestException(
          'Веќе постои друг комитент со тој ЕДБ број.',
        );
      }
    }

    // 3. Спојување на новите податоци врз старите (companyId не смее да се менува од телото)
    delete updateClientDto.companyId;
    Object.assign(client, updateClientDto);

    // 4. Зачувување во базата на податоци
    return await this.clientRepository.save(client);
  }
}
