import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { LicenseService } from '../license/license.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private licenseService: LicenseService,
    private tenantsService: TenantsService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, passwordResetToken, passwordResetExpires, ...r } =
        user;
      return r;
    }
    return null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    // License validation - check on every login
    let license: { expiryDate?: Date; startDate?: Date; customerName?: string } | undefined;
    const roleName = user.role?.name;
    const tenantId = user.tenantId?.toString() || '';

    // ALWAYS check if tenant is active for non-dealer roles
    if (roleName !== 'dealer' && tenantId) {
      const tenant = await this.tenantsService.findOne(tenantId);
      if (!tenant || !tenant.isActive) {
        throw new UnauthorizedException('Account is not activated. Please contact the provider.');
      }
    }

    // Enforce license validation per computer for non-dealer roles
    if (roleName !== 'dealer') {
      if (!dto.computerId) {
        throw new BadRequestException('Computer ID is required for license validation.');
      }
      try {
        const licenseCheck = await this.licenseService.validateLicense(dto.computerId, tenantId);
        if (!licenseCheck.valid) {
          throw new UnauthorizedException(licenseCheck.message || 'License validation failed');
        } else {
          const info = await this.licenseService.getLicenseInfo(dto.computerId, tenantId);
          license = info
            ? {
                expiryDate: info.expiryDate,
                startDate: info.startDate,
                customerName: info.customerName,
              }
            : undefined;
        }
      } catch (err) {
        console.error('License check error:', err.message);
        if (err instanceof UnauthorizedException) throw err;
        throw new UnauthorizedException('License validation failed');
      }
    }

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role?.name,
        tenantId: tenantId,
      }),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
        role: user.role?.name,
        tenantId: tenantId,
      },
      license,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email already registered');
    
    let tenantId = undefined;
    if (dto.companyName) {
      const tenant = await this.tenantsService.create({ name: dto.companyName });
      tenantId = tenant._id.toString();
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.usersService.create({
      email,
      passwordHash: hashed,
      fullName: dto.fullName,
      department: dto.department,
      roleName: dto.roleName || 'admin',
      tenantId,
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If email exists, reset link was sent' };
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);
    await this.usersService.setPasswordReset(user.id, token, expires);
    return {
      message: 'If email exists, reset link was sent',
      resetToken: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date())
      throw new BadRequestException('Invalid or expired reset token');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    await this.usersService.clearPasswordReset(user.id);
    return { message: 'Password updated successfully' };
  }
}
