import {
    IncomeClass,
    PrismaClient,
    ProcurementMode,
    ProcurementRegime,
} from '@prisma/client';

/** Demo GPPB-style ceilings in centavos (not official — replace with live GPPB tables). */
const EFFECTIVE_FROM = new Date(Date.UTC(2025, 0, 1));

type ThresholdRow = {
    regime: ProcurementRegime;
    incomeClass: IncomeClass;
    mode: ProcurementMode;
    maxAmountCentavos: bigint;
    gppbReference: string;
};

const DEMO_THRESHOLDS: ThresholdRow[] = [
    {
        regime: ProcurementRegime.RA12009,
        incomeClass: IncomeClass.BARANGAY,
        mode: ProcurementMode.SVP,
        maxAmountCentavos: 200_000_00n, // ₱200,000
        gppbReference: 'DEMO-GPPB-2025',
    },
    {
        regime: ProcurementRegime.RA12009,
        incomeClass: IncomeClass.BARANGAY,
        mode: ProcurementMode.SHOPPING,
        maxAmountCentavos: 50_000_00n,
        gppbReference: 'DEMO-GPPB-2025',
    },
    {
        regime: ProcurementRegime.RA12009,
        incomeClass: IncomeClass.MUNICIPALITY_4TH,
        mode: ProcurementMode.SVP,
        maxAmountCentavos: 1_000_000_00n, // ₱1,000,000 demo
        gppbReference: 'DEMO-GPPB-2025',
    },
    {
        regime: ProcurementRegime.RA12009,
        incomeClass: IncomeClass.MUNICIPALITY_4TH,
        mode: ProcurementMode.SHOPPING,
        maxAmountCentavos: 200_000_00n,
        gppbReference: 'DEMO-GPPB-2025',
    },
    {
        regime: ProcurementRegime.RA12009,
        incomeClass: IncomeClass.MUNICIPALITY_1ST,
        mode: ProcurementMode.SVP,
        maxAmountCentavos: 2_000_000_00n,
        gppbReference: 'DEMO-GPPB-2025',
    },
    {
        regime: ProcurementRegime.RA9184,
        incomeClass: IncomeClass.MUNICIPALITY_4TH,
        mode: ProcurementMode.SVP,
        maxAmountCentavos: 500_000_00n,
        gppbReference: 'DEMO-GPPB-LEGACY',
    },
];

export async function seedProcurementThresholds(prisma: PrismaClient) {
    for (const row of DEMO_THRESHOLDS) {
        await prisma.procurementThreshold.upsert({
            where: {
                regime_incomeClass_mode_effectiveFrom: {
                    regime: row.regime,
                    incomeClass: row.incomeClass,
                    mode: row.mode,
                    effectiveFrom: EFFECTIVE_FROM,
                },
            },
            update: {
                maxAmountCentavos: row.maxAmountCentavos,
                gppbReference: row.gppbReference,
            },
            create: {
                regime: row.regime,
                incomeClass: row.incomeClass,
                mode: row.mode,
                maxAmountCentavos: row.maxAmountCentavos,
                effectiveFrom: EFFECTIVE_FROM,
                gppbReference: row.gppbReference,
            },
        });
    }

    console.log(`Seeded ${DEMO_THRESHOLDS.length} procurement thresholds (demo)`);
}

async function main() {
    const prisma = new PrismaClient();
    try {
        await seedProcurementThresholds(prisma);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Procurement threshold seed failed:', error);
        process.exit(1);
    });
}
