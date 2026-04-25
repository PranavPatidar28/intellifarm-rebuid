import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DiseaseAnalysisInput = {
  cropName: string;
  userNote?: string;
  captureMode: 'STANDARD' | 'CAMERA_DUAL_ANGLE';
  images: Express.Multer.File[];
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

    const formData = new FormData();
    formData.set('cropName', input.cropName);
    formData.set('captureMode', input.captureMode);
    if (input.userNote) {
      formData.set('userNote', input.userNote);
    }

    for (const image of input.images) {
      formData.append(
        'images',
        new Blob([new Uint8Array(image.buffer)], { type: image.mimetype }),
        image.originalname,
      );
    }

    const response = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Disease provider failed with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;

    const status: 'ANALYZED' | 'ESCALATED' =
      (readString(payload.status) ?? 'ESCALATED') === 'ANALYZED'
        ? 'ANALYZED'
        : 'ESCALATED';

    return {
      predictedIssue:
        readString(payload.predictedIssue) ??
        readString(payload.issue) ??
        'Unclear issue',
      confidenceScore: readNumber(
        payload.confidenceScore ?? payload.confidence ?? 0.35,
      ),
      recommendation:
        readString(payload.recommendation) ??
        'Please consult a local expert before taking action.',
      escalationRequired: readBoolean(payload.escalationRequired) ?? true,
      status,
      provider: 'http-disease-provider',
      providerRef:
        readString(payload.providerRef) ??
        readString(payload.requestId) ??
        undefined,
      analysisSource: 'LIVE_PROVIDER' as const,
    };
  }
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0.35;
  }

  return 0.35;
}

function readBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return null;
}
