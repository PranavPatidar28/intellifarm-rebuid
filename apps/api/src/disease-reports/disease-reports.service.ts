import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DISEASE_PROVIDER, type DiseaseProvider } from './disease-provider';

@Injectable()
export class DiseaseReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @Inject(DISEASE_PROVIDER)
    private readonly diseaseProvider: DiseaseProvider,
  ) {}

  async listReports(userId: string) {
    const reports = await this.prisma.diseaseReport.findMany({
      where: {
        cropSeason: {
          farmPlot: {
            userId,
          },
        },
      },
      include: {
        cropSeason: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { reports };
  }

  async getReport(userId: string, reportId: string) {
    const report = await this.prisma.diseaseReport.findFirst({
      where: {
        id: reportId,
        cropSeason: {
          farmPlot: {
            userId,
          },
        },
      },
      include: {
        cropSeason: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Disease report not found');
    }

    return { report };
  }

  async createReport(
    userId: string,
    payload: {
      cropSeasonId: string;
      userNote?: string;
      captureMode: 'STANDARD' | 'CAMERA_DUAL_ANGLE';
    },
    files: {
      images?: Express.Multer.File[];
      diseasedImage?: Express.Multer.File[];
      cropImage?: Express.Multer.File[];
      voiceNote?: Express.Multer.File[];
    },
  ) {
    const season = await this.prisma.cropSeason.findFirst({
      where: {
        id: payload.cropSeasonId,
        farmPlot: {
          userId,
        },
      },
    });

    if (!season) {
      throw new NotFoundException('Crop season not found');
    }

    if (payload.captureMode !== 'CAMERA_DUAL_ANGLE') {
      throw new BadRequestException(
        'Disease reports require dual-angle capture with a diseased photo and a healthy/reference crop photo.',
      );
    }

    const { diseasedImage, cropImage, images } = this.resolveDiseaseImages(files);
    if (!diseasedImage || !cropImage) {
      throw new BadRequestException(
        'Dual-angle capture requires both a diseased photo and a healthy/reference crop photo.',
      );
    }

    const [image1Url, image2Url] = await Promise.all([
      this.storageService.saveFile(diseasedImage, 'disease-reports'),
      this.storageService.saveFile(cropImage, 'disease-reports'),
    ]);

    const voiceNoteUrl = files.voiceNote?.[0]
      ? await this.storageService.saveFile(files.voiceNote[0], 'voice-notes')
      : undefined;

    let analysis;
    try {
      analysis = await this.diseaseProvider.analyzeDualAngleImages({
        cropName: season.cropName,
        userNote: payload.userNote,
        captureMode: payload.captureMode,
        images,
        diseasedImage,
        cropImage,
      });
    } catch {
      analysis = {
        predictedIssue: 'Unclear issue',
        confidenceScore: 0.32,
        recommendation:
          'The live disease service is unavailable. Review the issue with a local agronomist or KVK before acting.',
        escalationRequired: true,
        status: 'ESCALATED' as const,
        provider: 'mock-fallback-disease-provider',
        analysisSource: 'MOCK_PROVIDER' as const,
        providerRef: undefined,
      };
    }

    const report = await this.prisma.diseaseReport.create({
      data: {
        cropSeasonId: payload.cropSeasonId,
        image1Url,
        image2Url,
        voiceNoteUrl,
        userNote: payload.userNote,
        predictedIssue: analysis.predictedIssue,
        confidenceScore: analysis.confidenceScore,
        recommendation: analysis.recommendation,
        escalationRequired: analysis.escalationRequired,
        status: analysis.status,
        provider: analysis.provider,
        providerRef: analysis.providerRef,
        captureMode: payload.captureMode,
        analysisSource: analysis.analysisSource,
      },
    });

    return { report };
  }

  private resolveDiseaseImages(files: {
    images?: Express.Multer.File[];
    diseasedImage?: Express.Multer.File[];
    cropImage?: Express.Multer.File[];
  }) {
    const legacyImages = files.images ?? [];
    const diseasedImage = files.diseasedImage?.[0] ?? legacyImages[0];
    const cropImage = files.cropImage?.[0] ?? legacyImages[1];
    const images = [diseasedImage, cropImage].filter(
      (image): image is Express.Multer.File => Boolean(image),
    );

    return { diseasedImage, cropImage, images };
  }
}
