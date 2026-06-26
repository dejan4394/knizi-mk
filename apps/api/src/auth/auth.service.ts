import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/enums/user.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>, // Го тргнавме дупликатот од подолу
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const userExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (userExists)
      throw new BadRequestException('Корисник со овој е-маил веќе постои.');

    const company = new Company();
    company.name = dto.companyName;
    company.edb = dto.edb;
    const savedCompany = await this.companyRepo.save(company);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = new User();
    user.email = dto.email;
    user.password = hashedPassword;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.role = UserRole.OWNER;
    user.companyId = savedCompany.id;

    const savedUser = await this.userRepo.save(user);
    return this.generateToken(savedUser);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: { company: true },
      select: {
        company: {
          name: true,
        },
      },
    });
    if (!user) throw new UnauthorizedException('Невалидни кредиенцијали.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Невалидни кредиенцијали.');

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      // companyName: user.company.name,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
      },
    };
  }
}
