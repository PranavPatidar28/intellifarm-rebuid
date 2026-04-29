import { Injectable } from '@nestjs/common';
import type { Scheme } from '../generated/prisma';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSchemes(
    userId: string,
    query: {
      state?: string;
      category?: string;
      language?: 'en' | 'hi';
      cropName?: string;
      search?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const stateFilter = query.state || user?.state || undefined;
    const language = query.language || user?.preferredLanguage || 'en';
    const andFilters: Array<Record<string, unknown>> = [];

    if (query.category) {
      andFilters.push({
        category: {
          contains: query.category,
          mode: 'insensitive',
        },
      });
    }

    if (query.cropName) {
      andFilters.push({
        OR: [
          {
            relatedCrops: {
              has: query.cropName,
            },
          },
          {
            relatedCrops: {
              has: query.cropName.toLowerCase(),
            },
          },
          {
            relatedCrops: {
              has: query.cropName.toUpperCase(),
            },
          },
        ],
      });
    }

    if (query.search) {
      andFilters.push({
        OR: [
          {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (stateFilter) {
      andFilters.push({
        OR: [{ applicableState: 'ALL' }, { applicableState: stateFilter }],
      });
    }

    const schemes = await this.prisma.scheme.findMany({
      where: {
        active: true,
        language,
        ...(andFilters.length ? { AND: andFilters } : {}),
      },
      orderBy: [{ applicableState: 'asc' }, { title: 'asc' }],
    });

    const recommended = pickRecommendedScheme(schemes, query.cropName, stateFilter);

    return {
      generatedAt: new Date().toISOString(),
      schemes: schemes.map((scheme) => presentScheme(scheme, query.cropName, stateFilter)),
      recommendedSchemeId: recommended?.id ?? null,
    };
  }
}

function presentScheme(
  scheme: Scheme,
  cropName?: string,
  stateFilter?: string,
) {
  return {
    id: scheme.id,
    title: scheme.title,
    titleHi: scheme.titleHi,
    description: scheme.description,
    descriptionHi: scheme.descriptionHi,
    category: scheme.category,
    applicableState: scheme.applicableState,
    officialLink: scheme.officialLink,
    benefitSummary: buildBenefitSummary(scheme),
    eligibilityTone: inferEligibilityTone(scheme, cropName, stateFilter),
    priority: inferPriority(scheme, cropName),
    whyRelevant: buildWhyRelevant(scheme, cropName, stateFilter),
    documentsPreview: extractDocumentPreview(scheme.description),
    deadlineLabel: inferDeadlineLabel(scheme),
  };
}

function pickRecommendedScheme(
  schemes: Scheme[],
  cropName?: string,
  stateFilter?: string,
) {
  return (
    schemes.find((scheme) =>
      scheme.relatedCrops.some(
        (value) => value.toLowerCase() === cropName?.toLowerCase(),
      ),
    ) ??
    schemes.find((scheme) => scheme.applicableState === stateFilter) ??
    schemes[0] ??
    null
  );
}

function buildBenefitSummary(scheme: Scheme) {
  const clean = scheme.description.replace(/\s+/g, ' ').trim();
  return clean.length > 140 ? `${clean.slice(0, 137).trim()}...` : clean;
}

function inferEligibilityTone(
  scheme: Scheme,
  cropName?: string,
  stateFilter?: string,
) {
  if (
    cropName &&
    scheme.relatedCrops.some((value) => value.toLowerCase() === cropName.toLowerCase())
  ) {
    return 'LIKELY_ELIGIBLE' as const;
  }

  if (scheme.applicableState === 'ALL' || scheme.applicableState === stateFilter) {
    return 'CHECK_DETAILS' as const;
  }

  return 'NOT_ELIGIBLE' as const;
}

function inferPriority(scheme: Scheme, cropName?: string) {
  const haystack = `${scheme.title} ${scheme.description} ${scheme.category}`.toLowerCase();

  if (
    /insurance|pmfby|credit|kcc|subsidy|crop loss/.test(haystack) ||
    scheme.relatedCrops.some((value) => value.toLowerCase() === cropName?.toLowerCase())
  ) {
    return 'HIGH' as const;
  }

  if (/soil|health|card|market|storage|warehouse/.test(haystack)) {
    return 'MEDIUM' as const;
  }

  return 'LOW' as const;
}

function buildWhyRelevant(
  scheme: Scheme,
  cropName?: string,
  stateFilter?: string,
) {
  if (
    cropName &&
    scheme.relatedCrops.some((value) => value.toLowerCase() === cropName.toLowerCase())
  ) {
    return `This scheme explicitly lines up with ${cropName}, which makes it a strong fit for your current season.`;
  }

  if (scheme.applicableState === stateFilter) {
    return `This scheme is available in ${stateFilter}, so it is worth checking your documents and timing.`;
  }

  if (scheme.applicableState === 'ALL') {
    return 'This scheme is nationally available and may still support your farm decisions.';
  }

  return 'Check the state and document requirements carefully before applying.';
}

function extractDocumentPreview(description: string) {
  const preview = description
    .split(/[.;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return preview.length
    ? preview
    : ['Keep identity, land, and bank-related documents ready before applying.'];
}

function inferDeadlineLabel(scheme: Scheme) {
  const haystack = `${scheme.title} ${scheme.description}`.toLowerCase();

  if (/season|sowing|before harvest|claim/i.test(haystack)) {
    return 'Time-sensitive. Check the seasonal deadline early.';
  }

  return 'No clear deadline found. Verify the latest official schedule.';
}
