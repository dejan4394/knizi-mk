import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user.enum'; // Осигурај се дека патеката до твојот точен Enum е точна
import * as bcrypt from 'bcryptjs'; // Променето во bcryptjs за конзистентност со AuthService

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 1. Извлечи ги сите корисници за одредена компанија
  async findAllByCompany(companyId: number): Promise<User[]> {
    return this.userRepository.find({
      where: { companyId: companyId }, // Директно по соодветната колона
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

    // Хеширање со истата библиотека bcryptjs како во AuthService
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      role: dto.role || UserRole.EMPLOYEE, // Поправено: доделува EMPLOYEE ако не е пратено ништо, соодветно на твојот точен Enum
      companyId: companyId, // Директно мапирање на foreign key-от
    });

    const savedUser = await this.userRepository.save(newUser);

    // Чисто и безбедно отстранување на лозинката од вратениот објект
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  // 3. Ажурирање на под-корисник (Само во рамките на истата компанија)
  async updateSubUser(
    companyId: number,
    userId: number,
    dto: any,
  ): Promise<Omit<User, 'password'>> {
    // Најди го корисникот, но осигурај се дека припаѓа на истата компанија
    const user = await this.userRepository.findOne({
      where: { id: userId, companyId: companyId },
    });

    if (!user) {
      throw new ConflictException(
        'Корисникот не е пронајден во вашата компанија.',
      );
    }

    // Спречи го сопственикот ненамерно да си ја смени сопствената улога преку оваа рута
    if (
      user.role === UserRole.OWNER &&
      dto.role &&
      dto.role !== UserRole.OWNER
    ) {
      throw new ConflictException(
        'Не можете да ја промените улогата на главниот сопственик.',
      );
    }

    // Ажурирај ги само дозволените полиња
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.role) user.role = dto.role;

    const updatedUser = await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = updatedUser;

    // Го кастираме како Omit<User, 'password'> за да се смири компајлерот
    return userWithoutPassword as unknown as Omit<User, 'password'>;
  }
}
