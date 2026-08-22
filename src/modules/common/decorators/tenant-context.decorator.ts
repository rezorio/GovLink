import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantContext } from '../interfaces/auth.interface';

export const TenantCtx = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): TenantContext => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.sub) {
            throw new UnauthorizedException('Authentication required');
        }

        return {
            user_id: user.sub,
            email: user.email,
            municipality_id: user.municipality_id,
            barangay_id: user.barangay_id,
            roles: user.roles,
        };
    },
);
