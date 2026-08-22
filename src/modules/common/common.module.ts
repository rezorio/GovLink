import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './services/audit-log.service';
import { TenantScopeService } from './services/tenant-scope.service';

@Global()
@Module({
    providers: [AuditLogService, TenantScopeService],
    exports: [AuditLogService, TenantScopeService],
})
export class CommonModule {}
