import { ConfigService } from '@nestjs/config';

import {
  HttpDiseaseProvider,
  MockDiseaseProvider,
  type DiseaseProvider,
} from './disease-provider';
import { DiseaseReportsService } from './disease-reports.service';

describe('DiseaseReportsService', () => {
  const provider = new MockDiseaseProvider();

  it('escalates when the note is missing', () => {
    return expect(
      provider.analyzeDualAngleImages({
        cropName: 'Wheat',
        captureMode: 'STANDARD',
        images: [] as never,
      }),
    ).resolves.toMatchObject({
      escalationRequired: true,
      status: 'ESCALATED',
    });
  });

  it('identifies likely fungal leaf issues from note keywords', () => {
    return expect(
      provider.analyzeDualAngleImages({
        cropName: 'Wheat',
        captureMode: 'CAMERA_DUAL_ANGLE',
        userNote: 'Yellow spots are spreading after rain',
        images: [] as never,
      }),
    ).resolves.toMatchObject({
      predictedIssue: 'Possible fungal leaf issue',
      escalationRequired: false,
    });
  });

  it('rejects standard one-photo disease submissions', async () => {
    const service = new DiseaseReportsService(
      {
        cropSeason: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'season-id',
            cropName: 'Wheat',
          }),
        },
      } as never,
      {
        saveFile: jest.fn(),
      } as never,
      {
        analyzeDualAngleImages: jest.fn(),
      } satisfies DiseaseProvider,
    );

    await expect(
      service.createReport(
        'user-id',
        {
          cropSeasonId: 'season-id',
          captureMode: 'STANDARD',
        },
        {
          images: [makeFile('symptom.jpg')],
        },
      ),
    ).rejects.toThrow('Disease reports require dual-angle capture');
  });
});

describe('HttpDiseaseProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts named multipart files to the live prediction endpoint', async () => {
    const fetchSpy = mockFetchJson({
      request_id: 'live-request-1',
      image_path: '/tmp/uploads/symptom.jpg',
      disease_name: 'Leaf rust',
      final_answer: 'Likely leaf rust. Confirm locally before treatment.',
    });
    const provider = new HttpDiseaseProvider(makeConfigService());
    const cropImage = makeFile('healthy.jpg');
    const diseasedImage = makeFile('symptom.jpg');

    await expect(
      provider.analyzeDualAngleImages({
        cropName: 'Wheat',
        captureMode: 'CAMERA_DUAL_ANGLE',
        images: [diseasedImage, cropImage],
        cropImage,
        diseasedImage,
      }),
    ).resolves.toMatchObject({
      predictedIssue: 'Leaf rust',
      confidenceScore: 0.6,
      escalationRequired: false,
      status: 'ANALYZED',
      provider: 'crop-disease-detection-api',
      providerRef: 'live-request-1',
      analysisSource: 'LIVE_PROVIDER',
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://crop-disease-detection-api-338815576551.asia-south1.run.app/api/v1/predict',
    );
    expect(init.method).toBe('POST');
    const formData = init.body as FormData;
    expect(formData.has('crop_image')).toBe(true);
    expect(formData.has('diseased_image')).toBe(true);
  });

  it('escalates live responses with no disease name', async () => {
    mockFetchJson({
      request_id: 'live-request-blank',
      image_path: '/tmp/uploads/symptom.jpg',
      disease_name: '',
      final_answer: 'The image does not provide a clear disease signal.',
    });
    const provider = new HttpDiseaseProvider(makeConfigService());

    await expect(
      provider.analyzeDualAngleImages({
        cropName: 'Wheat',
        captureMode: 'CAMERA_DUAL_ANGLE',
        images: [makeFile('symptom.jpg'), makeFile('healthy.jpg')],
      }),
    ).resolves.toMatchObject({
      predictedIssue: 'Unclear issue',
      confidenceScore: 0.25,
      escalationRequired: true,
      status: 'ESCALATED',
      providerRef: 'live-request-blank',
    });
  });
});

function makeConfigService() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'DISEASE_PROVIDER_URL') {
        return 'https://crop-disease-detection-api-338815576551.asia-south1.run.app';
      }

      return undefined;
    }),
  } as unknown as ConfigService;
}

function makeFile(originalname: string): Express.Multer.File {
  return {
    originalname,
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image'),
  } as Express.Multer.File;
}

function mockFetchJson(payload: unknown) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}
