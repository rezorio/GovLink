import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppRole } from '@prisma/client';
import { JwtPayload } from '../common/interfaces/auth.interface';
import { PrismaService } from '../prisma/prisma.module';
import { LoginDto } from './dto/login.dto';

/** Fixed bcrypt hash used to normalize login timing when user is not found. */
const DUMMY_PASSWORD_HASH =
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

export interface LoginResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: string;
    user: {
        id: string;
        email: string;
        full_name: string;
        municipality_id: string;
        barangay_id: string | null;
        roles: AppRole[];
    };
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async login(dto: LoginDto): Promise<LoginResponse> {
        const user = await this.prisma.user.findFirst({
            where: {
                email: dto.email.toLowerCase(),
                isActive: true,
                deletedAt: null,
            },
        });

        if (!user) {
            await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
            throw new UnauthorizedException('Invalid email or password');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            municipality_id: user.municipalityId,
            barangay_id: user.barangayId,
            roles: user.roles,
        };

        const expiresInHours = this.configService.get<string>('JWT_EXPIRES_IN_HOURS', '8');

        return {
            access_token: await this.jwtService.signAsync(payload),
            token_type: 'Bearer',
            expires_in: `${expiresInHours}h`,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.fullName,
                municipality_id: user.municipalityId,
                barangay_id: user.barangayId,
                roles: user.roles,
            },
        };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: userId,
                isActive: true,
                deletedAt: null,
            },
            include: {
                municipality: {
                    select: {
                        id: true,
                        name: true,
                        province: true,
                        psgcCode: true,
                    },
                },
                barangay: {
                    select: {
                        id: true,
                        name: true,
                        psgcCode: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('User account is inactive or not found');
        }

        return {
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            municipality_id: user.municipalityId,
            barangay_id: user.barangayId,
            roles: user.roles,
            municipality: user.municipality,
            barangay: user.barangay,
        };
    }
}
