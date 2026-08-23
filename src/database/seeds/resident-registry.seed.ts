import { PrismaClient, ResidentRecordType } from '@prisma/client';

const DEMO_RESIDENTS: Array<{
    barangayName: string;
    municipalityPsgc: string;
    fullName: string;
    addressLine: string;
    phone: string;
    birthYear: number;
    recordType: ResidentRecordType;
}> = [
    {
        barangayName: 'Aguila',
        municipalityPsgc: '041022000',
        fullName: 'Maria Santos Dela Cruz',
        addressLine: 'Purok 3, Aguila, San Jose, Batangas',
        phone: '09171234567',
        birthYear: 1985,
        recordType: ResidentRecordType.RESIDENT,
    },
    {
        barangayName: 'Aguila',
        municipalityPsgc: '041022000',
        fullName: 'Juanito Reyes',
        addressLine: 'Sitio Maligaya, Aguila, San Jose, Batangas',
        phone: '09189876543',
        birthYear: 1978,
        recordType: ResidentRecordType.KASAMBAHAY,
    },
    {
        barangayName: 'Catarman',
        municipalityPsgc: '072227000',
        fullName: 'Ana Grace Villanueva',
        addressLine: 'Purok Sunflower, Catarman, Liloan, Cebu',
        phone: '09175551234',
        birthYear: 1992,
        recordType: ResidentRecordType.RESIDENT,
    },
];

export async function seedResidentRegistry(prisma: PrismaClient) {
    for (const demo of DEMO_RESIDENTS) {
        const municipality = await prisma.municipality.findFirst({
            where: { psgcCode: demo.municipalityPsgc },
            select: { id: true },
        });
        if (!municipality) {
            continue;
        }

        const barangay = await prisma.barangay.findFirst({
            where: {
                municipalityId: municipality.id,
                name: demo.barangayName,
            },
            select: { id: true },
        });
        if (!barangay) {
            continue;
        }

        const existing = await prisma.barangayResident.findFirst({
            where: {
                barangayId: barangay.id,
                fullName: demo.fullName,
            },
        });

        if (existing) {
            await prisma.barangayResident.update({
                where: { id: existing.id },
                data: {
                    addressLine: demo.addressLine,
                    phone: demo.phone,
                    birthYear: demo.birthYear,
                    recordType: demo.recordType,
                },
            });
        } else {
            await prisma.barangayResident.create({
                data: {
                    municipalityId: municipality.id,
                    barangayId: barangay.id,
                    fullName: demo.fullName,
                    addressLine: demo.addressLine,
                    phone: demo.phone,
                    birthYear: demo.birthYear,
                    recordType: demo.recordType,
                },
            });
        }

        console.log(`   └─ Registry: ${demo.fullName} (${demo.barangayName})`);
    }
}
