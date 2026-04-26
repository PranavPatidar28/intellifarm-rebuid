import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

export type DiseaseAnalysisInput = {
  cropName: string;
  userNote?: string;
  captureMode: 'STANDARD' | 'CAMERA_DUAL_ANGLE';
  images: Express.Multer.File[];
  cropImage?: Express.Multer.File;
  diseasedImage?: Express.Multer.File;
};

export type DiseaseAnalysisResult = {
  predictedIssue: string;
  confidenceScore: number;
  recommendation: string;
  escalationRequired: boolean;
  status: 'ANALYZED' | 'ESCALATED';
  provider: string;
  providerRef?: string;
  analysisSource: 'MOCK_PROVIDER' | 'LIVE_PROVIDER';
};

export interface DiseaseProvider {
  analyzeDualAngleImages(
    input: DiseaseAnalysisInput,
  ): Promise<DiseaseAnalysisResult>;
}

export const DISEASE_PROVIDER = Symbol('DISEASE_PROVIDER');

@Injectable()
export class MockDiseaseProvider implements DiseaseProvider {
  analyzeDualAngleImages(
    input: DiseaseAnalysisInput,
  ): Promise<DiseaseAnalysisResult> {
    const note = input.userNote?.toLowerCase().trim() ?? '';

    if (!note) {
      return Promise.resolve({
        predictedIssue: 'Unclear issue',
        confidenceScore:
          input.captureMode === 'CAMERA_DUAL_ANGLE' ? 0.42 : 0.32,
        recommendation:
          'The issue is not clear from the current input. Review both images with a local agronomist or KVK before taking action.',
        escalationRequired: true,
        status: 'ESCALATED' as const,
        provider: 'mock-disease-provider',
        analysisSource: 'MOCK_PROVIDER' as const,
      });
    }

    if (/(yellow|rust|powder|fungal|spots)/.test(note)) {
      return Promise.resolve({
        predictedIssue: 'Possible fungal leaf issue',
        confidenceScore:
          input.captureMode === 'CAMERA_DUAL_ANGLE' ? 0.81 : 0.74,
        recommendation:
          'Compare symptoms across multiple plants, avoid rushed spraying, and confirm the diagnosis with a local expert before any chemical treatment.',
        escalationRequired: false,
        status: 'ANALYZED' as const,
        provider: 'mock-disease-provider',
        analysisSource: 'MOCK_PROVIDER' as const,
      });
    }

    if (/(whitefly|aphid|sucking|sticky|honeydew|curl)/.test(note)) {
      return Promise.resolve({
        predictedIssue: 'Possible sucking pest pressure',
        confidenceScore:
          input.captureMode === 'CAMERA_DUAL_ANGLE' ? 0.78 : 0.71,
        recommendation:
          'Inspect the underside of leaves across several plants and consult local integrated pest management guidance before treatment.',
        escalationRequired: false,
        status: 'ANALYZED' as const,
        provider: 'mock-disease-provider',
        analysisSource: 'MOCK_PROVIDER' as const,
      });
    }

    if (/(wilt|droop|dry|water|stress)/.test(note)) {
      return Promise.resolve({
        predictedIssue: 'Possible moisture or wilt stress',
        confidenceScore:
          input.captureMode === 'CAMERA_DUAL_ANGLE' ? 0.68 : 0.61,
        recommendation:
          'Check root-zone moisture, irrigation timing, and drainage first. If the collapse continues, consult a local expert immediately.',
        escalationRequired: true,
        status: 'ESCALATED' as const,
        provider: 'mock-disease-provider',
        analysisSource: 'MOCK_PROVIDER' as const,
      });
    }

    return Promise.resolve({
      predictedIssue: 'Unclear issue',
      confidenceScore: 0.4,
      recommendation:
        'The symptom pattern is not clear enough for a safe recommendation. Please get a local expert opinion before acting.',
      escalationRequired: true,
      status: 'ESCALATED' as const,
      provider: 'mock-disease-provider',
      analysisSource: 'MOCK_PROVIDER' as const,
    });
  }
}

@Injectable()
export class HttpDiseaseProvider implements DiseaseProvider {
  constructor(private readonly configService: ConfigService) {}

  async analyzeDualAngleImages(
    input: DiseaseAnalysisInput,
  ): Promise<DiseaseAnalysisResult> {
    const baseUrl = this.configService.get<string>('DISEASE_PROVIDER_URL');
    const apiKey = this.configService.get<string>('DISEASE_PROVIDER_API_KEY');

    if (!baseUrl) {
      throw new Error('Disease provider URL is not configured');
    }

    const { cropImage, diseasedImage } = resolveLiveProviderImages(input);
    const formData = new FormData();
    formData.set('crop_image', toBlob(cropImage), cropImage.originalname);
    formData.set(
      'diseased_image',
      toBlob(diseasedImage),
      diseasedImage.originalname,
    );

    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/v1/predict`,
      {
        method: 'POST',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Disease provider failed with ${response.status}`);
    }

    const payload = liveDiseaseResponseSchema.parse(await response.json());
    const diseaseName = payload.disease_name.trim();
    const hasDiseaseName = diseaseName.length > 0;

    return {
      predictedIssue: hasDiseaseName ? diseaseName : 'Unclear issue',
      confidenceScore: hasDiseaseName ? 0.6 : 0.25,
      recommendation: appendConfidenceNote(payload.final_answer),
      escalationRequired: !hasDiseaseName,
      status: hasDiseaseName ? 'ANALYZED' : 'ESCALATED',
      provider: 'crop-disease-detection-api',
      providerRef: payload.request_id,
      analysisSource: 'LIVE_PROVIDER' as const,
    };
  }
}

const liveDiseaseResponseSchema = z.object({
  request_id: z.string().trim().min(1),
  image_path: z.string(),
  disease_name: z.string().default(''),
  final_answer: z.string().trim().min(1),
});

function resolveLiveProviderImages(input: DiseaseAnalysisInput) {
  const diseasedImage = input.diseasedImage ?? input.images[0];
  const cropImage = input.cropImage ?? input.images[1];

  if (!cropImage || !diseasedImage) {
    throw new Error(
      'Live disease provider requires both crop_image and diseased_image files',
    );
  }

  return { cropImage, diseasedImage };
}

function toBlob(image: Express.Multer.File) {
  return new Blob([new Uint8Array(image.buffer)], { type: image.mimetype });
}

function appendConfidenceNote(recommendation: string) {
  return [
    recommendation.trim(),
    'Live provider did not return numeric confidence, so Intellifarm is using a conservative confidence estimate.',
  ].join(' ');
}
