import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 1. Извлечи ги сите корисници за одредена компанија
  async findAllByCompany(companyId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { companyId: companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true,
        created_at: true,
      },
    });
  }

  // 2. Креирај под-корисник врзан за истата компанија
  async createSubUser(
    companyId: number,
    dto: any,
  ): Promise<Record<string, any>> {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Корисник со оваа е-пошта веќе постои во системот.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role || UserRole.EMPLOYEE,
      companyId: companyId,
    });

    const savedUser = await this.userRepository.save(newUser);
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  // 3. Ажурирање на под-корисник (Вклучено менување на е-маил и лозинка)
  async updateSubUser(
    companyId: number,
    userId: number,
    dto: any,
  ): Promise<Omit<User, 'password'>> {
    // Најди го корисникот во рамките на компанијата
    const user = await this.userRepository.findOne({
      where: { id: userId, companyId: companyId },
    });

    if (!user) {
      throw new NotFoundException(
        'Корисникот не е пронајден во вашата компанија.',
      );
    }

    // Спречи менување на улогата на OWNER корисник
    if (
      user.role === UserRole.OWNER &&
      dto.role &&
      dto.role !== UserRole.OWNER
    ) {
      throw new ForbiddenException(
        'Не можете да ја промените улогата на главниот сопственик.',
      );
    }

    // КЛУЧНО: Валидација на нов е-маил (Опција 1)
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: {
          email: dto.email,
          id: Not(userId), // Барај дали постои во БИЛО КОЈА друга фирма, освен кај овој јузер
        },
      });

      if (emailExists) {
        throw new ConflictException(
          'Оваа е-пошта веќе се користи од друг корисник во системот.',
        );
      }
      user.email = dto.email;
    }

    // КЛУЧНО: Валидација и Хеширање на нова лозинка (ако е пратена)
    if (dto.password && dto.password.trim() !== '') {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    // Ажурирај ги останатите дозволени полиња
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.role) user.role = dto.role;

    const updatedUser = await this.userRepository.save(user);
    const { password, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword as unknown as Omit<User, 'password'>;
  }

  // 4. НОВО: Бришење на под-корисник (Само во рамките на истата компанија)
  async deleteSubUser(
    companyId: number,
    userId: number,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, companyId: companyId },
    });

    if (!user) {
      throw new NotFoundException(
        'Корисникот не е пронајден во вашата компанија.',
      );
    }

    // Безбедносна кочница: OWNER не може да избрише друг OWNER преку оваа рута
    if (user.role === UserRole.OWNER) {
      throw new ForbiddenException(
        'Главен сопственик на компанијата не може да биде избришан.',
      );
    }

    await this.userRepository.remove(user);
    return { success: true };
  }
}
