import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from '../../common/interfaces/auth.interface';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
            algorithms: ['HS256'],
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        const user = await this.prisma.user.findFirst({
            where: {
                id: payload.sub,
                isActive: true,
                deletedAt: null,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User account is inactive or not found');
        }

        if (
            user.municipalityId !== payload.municipality_id ||
            user.barangayId !== payload.barangay_id
        ) {
            throw new UnauthorizedException('Token tenant scope mismatch');
        }

        return {
            sub: user.id,
            email: user.email,
            municipality_id: user.municipalityId,
            barangay_id: user.barangayId,
            roles: user.roles,
        };
    }
}
