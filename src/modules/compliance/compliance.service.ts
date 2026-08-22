import { Injectable } from '@nestjs/common';
import { ComplianceScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class ComplianceService {
    constructor(private readonly prisma: PrismaService) {}

    listRequirements(scope?: ComplianceScope) {
        return this.prisma.complianceRequirement.findMany({
            where: scope ? { scope } : undefined,
            orderBy: [{ category: 'asc' }, { code: 'asc' }],
        });
    }
}
