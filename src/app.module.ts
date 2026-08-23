import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './modules/common/common.module';
import { BarangaysModule } from './modules/barangays/barangays.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DirectivesModule } from './modules/directives/directives.module';
import { ExportsModule } from './modules/exports/exports.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { RegistryModule } from './modules/registry/registry.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlansModule } from './modules/plans/plans.module';
import { AssembliesModule } from './modules/assemblies/assemblies.module';
import { RolesGuard } from './modules/common/guards/roles.guard';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PrismaModule } from './modules/prisma/prisma.module';

const isTest = process.env.NODE_ENV === 'test';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60_000,
                limit: isTest ? 10_000 : 200,
            },
        ]),
        PrismaModule,
        CommonModule,
        AuthModule,
        HealthModule,
        DirectivesModule,
        BarangaysModule,
        ComplianceModule,
        ExportsModule,
        UploadsModule,
        AssignmentsModule,
        ProcurementModule,
        RegistryModule,
        NotificationsModule,
        PlansModule,
        AssembliesModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
