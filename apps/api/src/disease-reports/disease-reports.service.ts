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
      where: { userId },
      include: {
        cropSeason: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { reports: reports.map((report) => presentDiseaseReport(report)) };
  }

  async getReport(userId: string, reportId: string) {
    const report = await this.prisma.diseaseReport.findFirst({
      where: {
        id: reportId,
        userId,
      },
      include: {
        cropSeason: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Disease report not found');
    }

    return { report: presentDiseaseReport(report) };
  }

  async createReport(
    userId: string,
    payload: {
      cropSeasonId?: string;
      placeLabel?: string;
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
    const season = payload.cropSeasonId
      ? await this.prisma.cropSeason.findFirst({
          where: {
            id: payload.cropSeasonId,
            farmPlot: {
              userId,
            },
          },
        })
      : null;

    if (payload.cropSeasonId && !season) {
      throw new NotFoundException('Crop season not found');
    }

    const placeLabel = payload.placeLabel?.trim();
    if (!season && !placeLabel) {
      throw new BadRequestException(
        'Choose a saved crop season or enter a new place label.',
      );
    }

    if (payload.captureMode !== 'CAMERA_DUAL_ANGLE') {
      throw new BadRequestException(
        'Disease reports require dual-angle capture with a diseased photo and a healthy/reference crop photo.',
      );
    }

    const { diseasedImage, cropImage, images } =
      this.resolveDiseaseImages(files);
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
        cropName: season?.cropName ?? 'Unknown crop',
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
        userId,
        cropSeasonId: season?.id,
        placeLabel: season ? undefined : placeLabel,
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
      include: {
        cropSeason: true,
      },
    });

    return { report: presentDiseaseReport(report) };
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

function presentDiseaseReport(
  report: {
    id: string;
    userId: string;
    cropSeasonId: string | null;
    placeLabel: string | null;
    image1Url: string | null;
    image2Url: string | null;
    voiceNoteUrl: string | null;
    userNote: string | null;
    predictedIssue: string | null;
    confidenceScore: number;
    recommendation: string;
    escalationRequired: boolean;
    status: 'PENDING' | 'ANALYZED' | 'ESCALATED';
    provider: string;
    providerRef: string | null;
    captureMode: 'STANDARD' | 'CAMERA_DUAL_ANGLE';
    analysisSource: 'MOCK_PROVIDER' | 'LIVE_PROVIDER';
    cropSeason?:
      | {
          id: string;
          cropName: string;
          currentStage: string;
          sowingDate: Date;
          farmPlotId: string;
          status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
        }
      | null;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  const confidenceBand =
    report.confidenceScore >= 0.75
      ? 'HIGH'
      : report.confidenceScore >= 0.45
        ? 'MEDIUM'
        : 'LOW';
  const predictedIssue = report.predictedIssue ?? 'Unclear issue';
  const possibleCause = derivePossibleCause(predictedIssue, report.userNote);
  const safeFirstAction = deriveSafeFirstAction(report.recommendation);
  const nextActions = deriveNextActions(report);

  return {
    id: report.id,
    userId: report.userId,
    cropSeasonId: report.cropSeasonId,
    placeLabel: report.placeLabel,
    image1Url: report.image1Url,
    image2Url: report.image2Url,
    voiceNoteUrl: report.voiceNoteUrl,
    userNote: report.userNote,
    predictedIssue: report.predictedIssue,
    confidenceScore: report.confidenceScore,
    confidenceBand,
    recommendation: report.recommendation,
    escalationRequired: report.escalationRequired,
    status: report.status,
    provider: report.provider,
    providerRef: report.providerRef,
    captureMode: report.captureMode,
    analysisSource: report.analysisSource,
    symptomsDetected: deriveSymptomsDetected(report.userNote, predictedIssue),
    possibleCause,
    safeFirstAction,
    whatNotToDo: [
      'Do not treat this as a confirmed diagnosis without field verification.',
      'Do not rush into chemical mixing without checking local expert guidance.',
    ],
    nextActions,
    escalationReason: report.escalationRequired
      ? confidenceBand === 'LOW'
        ? 'AI confidence is still low, so expert review is strongly recommended.'
        : 'The issue may need expert review before you act.'
      : null,
    cropSeason: report.cropSeason
      ? {
          id: report.cropSeason.id,
          cropName: report.cropSeason.cropName,
          currentStage: report.cropSeason.currentStage,
          sowingDate: report.cropSeason.sowingDate.toISOString(),
          farmPlotId: report.cropSeason.farmPlotId,
          status: report.cropSeason.status,
        }
      : null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

function derivePossibleCause(predictedIssue: string, userNote?: string | null) {
  const haystack = `${predictedIssue} ${userNote ?? ''}`.toLowerCase();

  if (/fung|leaf|spot|rust|powder/.test(haystack)) {
    return 'A fungal or leaf-surface issue may be affecting the crop.';
  }

  if (/whitefly|aphid|sucking|sticky|honeydew|curl/.test(haystack)) {
    return 'A sucking pest pattern may be contributing to the symptoms.';
  }

  if (/wilt|droop|dry|water|stress/.test(haystack)) {
    return 'Moisture stress or root-zone stress may be contributing to the crop decline.';
  }

  return 'The current evidence is not strong enough to confirm one exact cause.';
}

function deriveSafeFirstAction(recommendation: string) {
  const firstSentence = recommendation.split(/[.!?]/)[0]?.trim();

  return firstSentence?.length
    ? firstSentence
    : 'Inspect more plants before making any treatment decision.';
}

function deriveSymptomsDetected(
  userNote: string | null,
  predictedIssue: string,
) {
  const note = userNote?.trim();

  if (!note) {
    return predictedIssue === 'Unclear issue'
      ? ['Symptoms were not strong enough for a clear match']
      : [predictedIssue];
  }

  return note
    .split(/[.,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function deriveNextActions(report: {
  escalationRequired: boolean;
  confidenceScore: number;
  captureMode: 'STANDARD' | 'CAMERA_DUAL_ANGLE';
}) {
  const nextActions = [
    'Compare symptoms across several plants before deciding treatment.',
    'Keep clear photos ready in case you need expert help.',
  ];

  if (report.captureMode === 'CAMERA_DUAL_ANGLE') {
    nextActions.unshift('Retake photos in daylight if symptoms are spreading quickly.');
  }

  if (report.escalationRequired || report.confidenceScore < 0.45) {
    nextActions.push('Escalate this case to an expert or KVK before chemical action.');
  }

  return nextActions.slice(0, 3);
}
