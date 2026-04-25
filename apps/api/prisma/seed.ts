import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CropSeed = {
  slug: string;
  nameEn: string;
  nameHi: string;
  stages: Array<{
    stageKey: string;
    labelEn: string;
    labelHi: string;
    startDay: number;
    endDay: number;
    sortOrder: number;
  }>;
  tasks: Array<{
    stageKey: string;
    titleEn: string;
    titleHi: string;
    descriptionEn: string;
    descriptionHi: string;
    dueDayOffset: number;
    taskType:
      | 'IRRIGATION'
      | 'FERTILIZER'
      | 'SCOUTING'
      | 'HARVEST_PREP'
      | 'GENERAL';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    weatherCondition?: Record<string, unknown>;
  }>;
};

const cropSeeds: CropSeed[] = [
  {
    slug: 'wheat',
    nameEn: 'Wheat',
    nameHi: 'गेहूं',
    stages: [
      {
        stageKey: 'establishment',
        labelEn: 'Establishment',
        labelHi: 'स्थापना',
        startDay: 0,
        endDay: 14,
        sortOrder: 1,
      },
      {
        stageKey: 'tillering',
        labelEn: 'Tillering',
        labelHi: 'टिलरिंग',
        startDay: 15,
        endDay: 49,
        sortOrder: 2,
      },
      {
        stageKey: 'flowering',
        labelEn: 'Flowering',
        labelHi: 'फूल बनना',
        startDay: 50,
        endDay: 89,
        sortOrder: 3,
      },
      {
        stageKey: 'grain-fill',
        labelEn: 'Grain Fill',
        labelHi: 'दाना भरना',
        startDay: 90,
        endDay: 124,
        sortOrder: 4,
      },
      {
        stageKey: 'harvest-ready',
        labelEn: 'Harvest Ready',
        labelHi: 'कटाई तैयारी',
        startDay: 125,
        endDay: 160,
        sortOrder: 5,
      },
    ],
    tasks: [
      {
        stageKey: 'establishment',
        titleEn: 'Check field moisture',
        titleHi: 'खेत की नमी जांचें',
        descriptionEn:
          'Inspect seedling emergence and apply light irrigation if the top soil dries out.',
        descriptionHi:
          'अंकुरण देखें और ऊपर की मिट्टी सूखने पर हल्की सिंचाई करें।',
        dueDayOffset: 7,
        taskType: 'IRRIGATION',
        priority: 'HIGH',
      },
      {
        stageKey: 'tillering',
        titleEn: 'Apply first nutrient top-up',
        titleHi: 'पहला पोषण टॉप-अप दें',
        descriptionEn:
          'Review local agronomy guidance for the first fertilizer split and apply only if soil moisture is suitable.',
        descriptionHi:
          'पहले उर्वरक स्प्लिट के लिए स्थानीय सलाह देखें और नमी सही होने पर ही उपयोग करें।',
        dueDayOffset: 28,
        taskType: 'FERTILIZER',
        priority: 'HIGH',
      },
      {
        stageKey: 'flowering',
        titleEn: 'Scout for rust and lodging',
        titleHi: 'रस्ट और गिरने की जांच करें',
        descriptionEn:
          'Walk the field edges and middle rows to watch for rust symptoms or lodging after wind or rain.',
        descriptionHi:
          'हवा या बारिश के बाद खेत की किनारों और बीच की कतारों में रस्ट या गिरने के लक्षण देखें।',
        dueDayOffset: 65,
        taskType: 'SCOUTING',
        priority: 'MEDIUM',
      },
      {
        stageKey: 'harvest-ready',
        titleEn: 'Prepare harvest logistics',
        titleHi: 'कटाई की तैयारी करें',
        descriptionEn:
          'Check labor, bags, drying space, and mandi planning for the upcoming harvest window.',
        descriptionHi:
          'मजदूर, बोरी, सुखाने की जगह और मंडी योजना की तैयारी करें।',
        dueDayOffset: 130,
        taskType: 'HARVEST_PREP',
        priority: 'HIGH',
      },
    ],
  },
  {
    slug: 'paddy',
    nameEn: 'Paddy',
    nameHi: 'धान',
    stages: [
      {
        stageKey: 'nursery-establishment',
        labelEn: 'Nursery / Establishment',
        labelHi: 'नर्सरी / स्थापना',
        startDay: 0,
        endDay: 20,
        sortOrder: 1,
      },
      {
        stageKey: 'vegetative',
        labelEn: 'Vegetative',
        labelHi: 'विकास',
        startDay: 21,
        endDay: 50,
        sortOrder: 2,
      },
      {
        stageKey: 'panicle-initiation',
        labelEn: 'Panicle Initiation',
        labelHi: 'बालियां बनना',
        startDay: 51,
        endDay: 85,
        sortOrder: 3,
      },
      {
        stageKey: 'grain-development',
        labelEn: 'Grain Development',
        labelHi: 'दाना विकास',
        startDay: 86,
        endDay: 115,
        sortOrder: 4,
      },
      {
        stageKey: 'harvest-ready',
        labelEn: 'Harvest Ready',
        labelHi: 'कटाई तैयारी',
        startDay: 116,
        endDay: 145,
        sortOrder: 5,
      },
    ],
    tasks: [
      {
        stageKey: 'nursery-establishment',
        titleEn: 'Maintain standing water carefully',
        titleHi: 'खड़े पानी का संतुलन रखें',
        descriptionEn:
          'Keep shallow standing water and inspect transplant shock or patchy establishment.',
        descriptionHi:
          'हल्का खड़ा पानी रखें और रोपाई के बाद कमजोर पौधों की जांच करें।',
        dueDayOffset: 10,
        taskType: 'IRRIGATION',
        priority: 'HIGH',
      },
      {
        stageKey: 'vegetative',
        titleEn: 'Review weed pressure',
        titleHi: 'खरपतवार दबाव देखें',
        descriptionEn:
          'Inspect weed pressure in field corners and note if manual or local extension-supported control is needed.',
        descriptionHi:
          'खेत के कोनों में खरपतवार देखें और जरूरत हो तो स्थानीय सलाह लें।',
        dueDayOffset: 30,
        taskType: 'SCOUTING',
        priority: 'MEDIUM',
      },
      {
        stageKey: 'panicle-initiation',
        titleEn: 'Plan second nutrition review',
        titleHi: 'दूसरे पोषण की समीक्षा करें',
        descriptionEn:
          'Coordinate the next fertilizer check with local recommendations and expected rainfall.',
        descriptionHi:
          'अगले उर्वरक निर्णय को स्थानीय सलाह और बारिश के अनुमान से मिलाएं।',
        dueDayOffset: 60,
        taskType: 'FERTILIZER',
        priority: 'HIGH',
      },
      {
        stageKey: 'harvest-ready',
        titleEn: 'Check grain maturity and drying space',
        titleHi: 'दाने की पकावट और सुखाने की जगह देखें',
        descriptionEn:
          'Confirm grain maturity and prepare drying space before cutting begins.',
        descriptionHi:
          'कटाई से पहले दाने की पकावट और सुखाने की जगह सुनिश्चित करें।',
        dueDayOffset: 120,
        taskType: 'HARVEST_PREP',
        priority: 'HIGH',
      },
    ],
  },
  {
    slug: 'cotton',
    nameEn: 'Cotton',
    nameHi: 'कपास',
    stages: [
      {
        stageKey: 'establishment',
        labelEn: 'Establishment',
        labelHi: 'स्थापना',
        startDay: 0,
        endDay: 20,
        sortOrder: 1,
      },
      {
        stageKey: 'square-formation',
        labelEn: 'Square Formation',
        labelHi: 'स्क्वेयर बनना',
        startDay: 21,
        endDay: 60,
        sortOrder: 2,
      },
      {
        stageKey: 'flowering',
        labelEn: 'Flowering',
        labelHi: 'फूल बनना',
        startDay: 61,
        endDay: 105,
        sortOrder: 3,
      },
      {
        stageKey: 'boll-development',
        labelEn: 'Boll Development',
        labelHi: 'बोल विकास',
        startDay: 106,
        endDay: 150,
        sortOrder: 4,
      },
      {
        stageKey: 'pick-prep',
        labelEn: 'Pick Preparation',
        labelHi: 'तोड़ाई तैयारी',
        startDay: 151,
        endDay: 190,
        sortOrder: 5,
      },
    ],
    tasks: [
      {
        stageKey: 'establishment',
        titleEn: 'Check plant stand and gaps',
        titleHi: 'पौध संख्या और खाली जगह देखें',
        descriptionEn:
          'Look for plant gaps and moisture stress across the plot during early establishment.',
        descriptionHi: 'शुरुआती अवस्था में खाली जगह और नमी तनाव की जांच करें।',
        dueDayOffset: 8,
        taskType: 'SCOUTING',
        priority: 'MEDIUM',
      },
      {
        stageKey: 'square-formation',
        titleEn: 'Watch for sucking pests',
        titleHi: 'रस चूसने वाले कीट देखें',
        descriptionEn:
          'Inspect the underside of leaves for early sucking pest pressure and weak growth patches.',
        descriptionHi:
          'पत्तियों के नीचे रस चूसने वाले कीट और कमजोर बढ़वार की जांच करें।',
        dueDayOffset: 35,
        taskType: 'SCOUTING',
        priority: 'HIGH',
      },
      {
        stageKey: 'flowering',
        titleEn: 'Review irrigation timing',
        titleHi: 'सिंचाई समय की समीक्षा करें',
        descriptionEn:
          'Keep irrigation timely during flowering and avoid stress during hot, dry spells.',
        descriptionHi:
          'फूल अवस्था में समय पर सिंचाई रखें और गर्म, सूखे दिनों में तनाव न होने दें।',
        dueDayOffset: 75,
        taskType: 'IRRIGATION',
        priority: 'HIGH',
      },
      {
        stageKey: 'pick-prep',
        titleEn: 'Prepare for first picking',
        titleHi: 'पहली तोड़ाई की तैयारी करें',
        descriptionEn:
          'Check labor, storage bags, and dry storage space before the first picking window.',
        descriptionHi:
          'पहली तोड़ाई से पहले मजदूर, बोरी और सूखी भंडारण जगह की तैयारी करें।',
        dueDayOffset: 160,
        taskType: 'HARVEST_PREP',
        priority: 'HIGH',
      },
    ],
  },
];

const schemes = [
  {
    title: 'PM-KISAN',
    titleHi: 'पीएम-किसान',
    description:
      'Direct income support for eligible farmer families through periodic transfers.',
    descriptionHi: 'पात्र किसान परिवारों के लिए प्रत्यक्ष आय सहायता योजना।',
    category: 'Income Support',
    applicableState: 'ALL',
    officialLink: 'https://pmkisan.gov.in/',
    language: 'en' as const,
    relatedCrops: ['Wheat', 'Paddy', 'Cotton'],
  },
  {
    title: 'Soil Health Card',
    titleHi: 'मृदा स्वास्थ्य कार्ड',
    description:
      'Soil testing and nutrient advisory support to improve balanced input use.',
    descriptionHi: 'मिट्टी परीक्षण और पोषण सलाह से संतुलित उपयोग में मदद।',
    category: 'Soil & Advisory',
    applicableState: 'ALL',
    officialLink: 'https://soilhealth.dac.gov.in/',
    language: 'en' as const,
    relatedCrops: ['Wheat', 'Paddy', 'Cotton'],
  },
  {
    title: 'Punjab Crop Residue Support',
    titleHi: 'पंजाब फसल अवशेष सहायता',
    description:
      'State-backed support for crop residue management equipment and awareness.',
    descriptionHi: 'फसल अवशेष प्रबंधन उपकरण और जागरूकता हेतु राज्य समर्थन।',
    category: 'Machinery',
    applicableState: 'Punjab',
    officialLink: 'https://agripb.gov.in/',
    language: 'en' as const,
    relatedCrops: ['Wheat', 'Paddy'],
  },
  {
    title: 'Maharashtra Drip Support',
    titleHi: 'महाराष्ट्र ड्रिप सहायता',
    description:
      'Support for micro-irrigation adoption to improve water efficiency.',
    descriptionHi: 'माइक्रो इरिगेशन अपनाने के लिए जल-कुशलता सहायता।',
    category: 'Irrigation',
    applicableState: 'Maharashtra',
    officialLink: 'https://mahaagri.gov.in/',
    language: 'en' as const,
    relatedCrops: ['Cotton', 'Paddy'],
  },
];

const facilityRecords = [
  {
    type: 'MANDI' as const,
    name: 'Ludhiana Mandi',
    district: 'Ludhiana',
    state: 'Punjab',
    village: 'Baddowal',
    latitude: 30.901,
    longitude: 75.85,
    services: ['Auction', 'Weighbridge', 'MSP procurement'],
  },
  {
    type: 'MANDI' as const,
    name: 'Karnal Mandi',
    district: 'Karnal',
    state: 'Haryana',
    village: 'Karnal',
    latitude: 29.6857,
    longitude: 76.9905,
    services: ['Auction', 'Cleaning', 'Transport access'],
  },
  {
    type: 'MANDI' as const,
    name: 'Yavatmal Market',
    district: 'Yavatmal',
    state: 'Maharashtra',
    village: 'Yavatmal',
    latitude: 20.3899,
    longitude: 78.1307,
    services: ['Auction', 'Cotton handling'],
  },
  {
    type: 'MANDI' as const,
    name: 'Bareilly Mandi',
    district: 'Bareilly',
    state: 'Uttar Pradesh',
    village: 'Bareilly',
    latitude: 28.367,
    longitude: 79.4304,
    services: ['Auction', 'Weighbridge'],
  },
  {
    type: 'WAREHOUSE' as const,
    name: 'Punjab Agri Warehouse',
    district: 'Ludhiana',
    state: 'Punjab',
    village: 'Baddowal',
    latitude: 30.8923,
    longitude: 75.8448,
    services: ['Storage', 'Drying', 'Bagging'],
  },
  {
    type: 'WAREHOUSE' as const,
    name: 'Bareilly Storage Hub',
    district: 'Bareilly',
    state: 'Uttar Pradesh',
    village: 'Bareilly',
    latitude: 28.3751,
    longitude: 79.4352,
    services: ['Storage', 'Grading'],
  },
  {
    type: 'WAREHOUSE' as const,
    name: 'Yavatmal Cotton Warehouse',
    district: 'Yavatmal',
    state: 'Maharashtra',
    village: 'Yavatmal',
    latitude: 20.3984,
    longitude: 78.1205,
    services: ['Storage', 'Cotton bale handling'],
  },
];

const marketRecords = [
  {
    cropName: 'Wheat',
    mandiName: 'Ludhiana Mandi',
    district: 'Ludhiana',
    state: 'Punjab',
    priceMin: 2300,
    priceMax: 2540,
    priceModal: 2425,
    source: 'Seeded Demo Data',
  },
  {
    cropName: 'Paddy',
    mandiName: 'Karnal Mandi',
    district: 'Karnal',
    state: 'Haryana',
    priceMin: 1980,
    priceMax: 2210,
    priceModal: 2105,
    source: 'Seeded Demo Data',
  },
  {
    cropName: 'Cotton',
    mandiName: 'Yavatmal Market',
    district: 'Yavatmal',
    state: 'Maharashtra',
    priceMin: 6450,
    priceMax: 7025,
    priceModal: 6760,
    source: 'Seeded Demo Data',
  },
  {
    cropName: 'Wheat',
    mandiName: 'Bareilly Mandi',
    district: 'Bareilly',
    state: 'Uttar Pradesh',
    priceMin: 2250,
    priceMax: 2480,
    priceModal: 2380,
    source: 'Seeded Demo Data',
  },
];

async function seedCrops() {
  for (const crop of cropSeeds) {
    const cropDefinition = await prisma.cropDefinition.upsert({
      where: { slug: crop.slug },
      update: {
        nameEn: crop.nameEn,
        nameHi: crop.nameHi,
        active: true,
      },
      create: {
        slug: crop.slug,
        nameEn: crop.nameEn,
        nameHi: crop.nameHi,
        active: true,
      },
    });

    await prisma.cropStageRule.deleteMany({
      where: { cropDefinitionId: cropDefinition.id },
    });
    await prisma.taskTemplate.deleteMany({
      where: { cropDefinitionId: cropDefinition.id },
    });

    await prisma.cropStageRule.createMany({
      data: crop.stages.map((stage) => ({
        cropDefinitionId: cropDefinition.id,
        ...stage,
      })),
    });

    await prisma.taskTemplate.createMany({
      data: crop.tasks.map((task) => ({
        cropDefinitionId: cropDefinition.id,
        stageKey: task.stageKey,
        titleEn: task.titleEn,
        titleHi: task.titleHi,
        descriptionEn: task.descriptionEn,
        descriptionHi: task.descriptionHi,
        dueDayOffset: task.dueDayOffset,
        taskType: task.taskType,
        priority: task.priority,
        weatherCondition: task.weatherCondition
          ? (task.weatherCondition as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      })),
    });
  }
}

async function seedSchemesAndMarkets() {
  await prisma.scheme.deleteMany();
  await prisma.marketRecord.deleteMany();
  await prisma.facility.deleteMany();

  const facilities = await Promise.all(
    facilityRecords.map((facility) =>
      prisma.facility.create({
        data: facility,
      }),
    ),
  );

  const facilityByName = new Map(
    facilities.map((facility) => [facility.name, facility.id]),
  );

  await prisma.scheme.createMany({
    data: schemes,
  });

  await prisma.marketRecord.createMany({
    data: marketRecords.map((record) => ({
      ...record,
      recordDate: new Date(),
      facilityId: facilityByName.get(record.mandiName) ?? null,
    })),
  });
}

async function seedDemoFarmer() {
  const demoUser = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {
      name: 'Demo Farmer',
      preferredLanguage: 'en',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Baddowal',
      role: 'FARMER',
    },
    create: {
      phone: '9876543210',
      name: 'Demo Farmer',
      preferredLanguage: 'en',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Baddowal',
      role: 'FARMER',
    },
  });

  const existingPlots = await prisma.farmPlot.count({
    where: { userId: demoUser.id },
  });
  if (existingPlots > 0) {
    return;
  }

  const wheat = await prisma.cropDefinition.findUniqueOrThrow({
    where: { slug: 'wheat' },
  });
  const cotton = await prisma.cropDefinition.findUniqueOrThrow({
    where: { slug: 'cotton' },
  });

  const northField = await prisma.farmPlot.create({
    data: {
      userId: demoUser.id,
      name: 'North Field',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Baddowal',
      area: 2.5,
      latitude: 30.9008,
      longitude: 75.8573,
      irrigationType: 'FLOOD',
      soilType: 'ALLUVIAL',
    },
  });

  const cottonField = await prisma.farmPlot.create({
    data: {
      userId: demoUser.id,
      name: 'Canal Side Plot',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Baddowal',
      area: 1.8,
      latitude: 30.9032,
      longitude: 75.8485,
      irrigationType: 'DRIP',
      soilType: 'BLACK_REGUR',
    },
  });

  await prisma.cropSeason.createMany({
    data: [
      {
        farmPlotId: northField.id,
        cropDefinitionId: wheat.id,
        cropName: 'Wheat',
        sowingDate: new Date(new Date().setDate(new Date().getDate() - 68)),
        currentStage: 'Flowering',
        status: 'ACTIVE',
      },
      {
        farmPlotId: cottonField.id,
        cropDefinitionId: cotton.id,
        cropName: 'Cotton',
        sowingDate: new Date(new Date().setDate(new Date().getDate() - 34)),
        currentStage: 'Square Formation',
        status: 'ACTIVE',
      },
    ],
  });
}

async function seedAdminUser() {
  await prisma.user.upsert({
    where: { phone: '9999999998' },
    update: {
      name: 'Internal Admin',
      preferredLanguage: 'en',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Baddowal',
      role: 'ADMIN',
    },
    create: {
      phone: '9999999998',
      name: 'Internal Admin',
      preferredLanguage: 'en',
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Baddowal',
      role: 'ADMIN',
    },
  });
}

async function main() {
  await seedCrops();
  await seedSchemesAndMarkets();
  await seedDemoFarmer();
  await seedAdminUser();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
