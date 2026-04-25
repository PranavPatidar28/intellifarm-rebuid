import { MockDiseaseProvider } from './disease-provider';

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
});
