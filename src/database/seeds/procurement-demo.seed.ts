import {
    AppLineStatus,
    ContractStatus,
    PrismaClient,
    ProcurementMode,
} from '@prisma/client';

/**
 * Demo APP line + contracts for San Jose / Aguila (or first barangay) for FE smoke.
 */
export async function seedProcurementDemo(prisma: PrismaClient) {
    const municipality = await prisma.municipality.findUnique({
        where: { psgcCode: '041022000' },
    });
    if (!municipality) {
        console.log('Skip procurement demo — San Jose not seeded');
        return;
    }

    const aguila = await prisma.barangay.findFirst({
        where: {
            municipalityId: municipality.id,
            name: { contains: 'Aguila', mode: 'insensitive' },
        },
    });
    const barangay =
        aguila ??
        (await prisma.barangay.findFirst({
            where: { municipalityId: municipality.id, isActive: true },
            orderBy: { name: 'asc' },
        }));

    if (!barangay) {
        console.log('Skip procurement demo — no barangay');
        return;
    }

    const fiscalYear = 2026;
    const appLine = await prisma.appLineItem.upsert({
        where: {
            barangayId_fiscalYear_code: {
                barangayId: barangay.id,
                fiscalYear,
                code: 'APP-2026-IT-001',
            },
        },
        update: {
            description: 'Office IT equipment and peripherals',
            category: 'IT Equipment',
            approvedAmountCentavos: 500_000_00n,
            status: AppLineStatus.APPROVED,
        },
        create: {
            municipalityId: municipality.id,
            barangayId: barangay.id,
            fiscalYear,
            code: 'APP-2026-IT-001',
            description: 'Office IT equipment and peripherals',
            category: 'IT Equipment',
            approvedAmountCentavos: 500_000_00n,
            status: AppLineStatus.APPROVED,
        },
    });

    const existing = await prisma.procurementContract.findFirst({
        where: {
            barangayId: barangay.id,
            title: 'Laptop units for barangay hall',
        },
    });

    if (!existing) {
        await prisma.procurementContract.create({
            data: {
                municipalityId: municipality.id,
                barangayId: barangay.id,
                appLineItemId: appLine.id,
                title: 'Laptop units for barangay hall',
                supplierName: 'Demo Office Supply Co.',
                amountCentavos: 150_000_00n,
                mode: ProcurementMode.SVP,
                status: ContractStatus.PLANNED,
                fiscalYear,
                category: 'IT Equipment',
            },
        });
    }

    console.log(`Seeded procurement demo for ${barangay.name} (FY ${fiscalYear})`);
}
