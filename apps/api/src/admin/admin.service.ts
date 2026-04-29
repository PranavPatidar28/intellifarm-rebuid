import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [users, farms, seasons, reports, schemes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.farmPlot.count(),
      this.prisma.cropSeason.count(),
      this.prisma.diseaseReport.count(),
      this.prisma.scheme.count(),
    ]);

    return {
      totals: { users, farms, seasons, reports, schemes },
    };
  }

  async listCropDefinitions() {
    const cropDefinitions = await this.prisma.cropDefinition.findMany({
      include: {
        stageRules: { orderBy: { sortOrder: 'asc' } },
        taskTemplates: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { cropDefinitions };
  }

  async createCropDefinition(payload: {
    slug: string;
    nameEn: string;
    nameHi: string;
    active: boolean;
  }) {
    const cropDefinition = await this.prisma.cropDefinition.create({
      data: payload,
    });

    return { cropDefinition };
  }

  async updateCropDefinition(
    id: string,
    payload: Partial<{
      slug: string;
      nameEn: string;
      nameHi: string;
      active: boolean;
    }>,
  ) {
    const cropDefinition = await this.prisma.cropDefinition.update({
      where: { id },
      data: payload,
    });

    return { cropDefinition };
  }

  async listCropStageRules() {
    const stageRules = await this.prisma.cropStageRule.findMany({
      orderBy: [{ cropDefinitionId: 'asc' }, { sortOrder: 'asc' }],
    });

    return { stageRules };
  }

  async createCropStageRule(payload: {
    cropDefinitionId: string;
    stageKey: string;
    labelEn: string;
    labelHi: string;
    startDay: number;
    endDay: number;
    sortOrder: number;
  }) {
    const stageRule = await this.prisma.cropStageRule.create({ data: payload });
    return { stageRule };
  }

  async updateCropStageRule(
    id: string,
    payload: Partial<{
      cropDefinitionId: string;
      stageKey: string;
      labelEn: string;
      labelHi: string;
      startDay: number;
      endDay: number;
      sortOrder: number;
    }>,
  ) {
    const stageRule = await this.prisma.cropStageRule.update({
      where: { id },
      data: payload,
    });
    return { stageRule };
  }

  async listTaskTemplates() {
    const taskTemplates = await this.prisma.taskTemplate.findMany({
      orderBy: [{ cropDefinitionId: 'asc' }, { dueDayOffset: 'asc' }],
    });
    return { taskTemplates };
  }

  async createTaskTemplate(payload: {
    cropDefinitionId: string;
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
    active: boolean;
  }) {
    const taskTemplate = await this.prisma.taskTemplate.create({
      data: payload,
    });
    return { taskTemplate };
  }

  async updateTaskTemplate(
    id: string,
    payload: Partial<{
      cropDefinitionId: string;
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
      active: boolean;
    }>,
  ) {
    const taskTemplate = await this.prisma.taskTemplate.update({
      where: { id },
      data: payload,
    });
    return { taskTemplate };
  }

  async listSchemes() {
    const schemes = await this.prisma.scheme.findMany({
      orderBy: [{ applicableState: 'asc' }, { title: 'asc' }],
    });
    return { schemes };
  }

  async createScheme(payload: {
    title: string;
    titleHi?: string;
    description: string;
    descriptionHi?: string;
    category: string;
    applicableState: string;
    officialLink: string;
    language: 'en' | 'hi';
    active: boolean;
  }) {
    const scheme = await this.prisma.scheme.create({ data: payload });
    return { scheme };
  }

  async updateScheme(
    id: string,
    payload: Partial<{
      title: string;
      titleHi?: string;
      description: string;
      descriptionHi?: string;
      category: string;
      applicableState: string;
      officialLink: string;
      language: 'en' | 'hi';
      active: boolean;
    }>,
  ) {
    const scheme = await this.prisma.scheme.update({
      where: { id },
      data: payload,
    });
    return { scheme };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { users };
  }

  async listFarmPlots() {
    const farmPlots = await this.prisma.farmPlot.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { farmPlots };
  }

  async listCropSeasons() {
    const cropSeasons = await this.prisma.cropSeason.findMany({
      include: {
        farmPlot: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { cropSeasons };
  }

  async listDiseaseReports() {
    const diseaseReports = await this.prisma.diseaseReport.findMany({
      include: {
        cropSeason: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { diseaseReports };
  }

  async listCommunityReports() {
    const reports = await this.prisma.communityReport.findMany({
      include: {
        reporter: true,
      },
      orderBy: [{ resolvedAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    const postIds = reports
      .filter((report) => report.targetType === 'POST')
      .map((report) => report.targetId);
    const replyIds = reports
      .filter((report) => report.targetType === 'REPLY')
      .map((report) => report.targetId);

    const [posts, replies] = await Promise.all([
      postIds.length
        ? this.prisma.communityPost.findMany({
            where: {
              id: {
                in: postIds,
              },
            },
            select: {
              id: true,
              title: true,
              body: true,
              hidden: true,
              locked: true,
            },
          })
        : Promise.resolve([]),
      replyIds.length
        ? this.prisma.communityReply.findMany({
            where: {
              id: {
                in: replyIds,
              },
            },
            select: {
              id: true,
              body: true,
              hidden: true,
              postId: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const postMap = new Map(posts.map((post) => [post.id, post]));
    const replyMap = new Map(replies.map((reply) => [reply.id, reply]));

    return {
      reports: reports.map((report) => ({
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        note: report.note,
        createdAt: report.createdAt,
        resolvedAt: report.resolvedAt,
        reporter: {
          id: report.reporter.id,
          name: report.reporter.name,
          phone: report.reporter.phone,
        },
        target:
          report.targetType === 'POST'
            ? postMap.get(report.targetId) ?? null
            : replyMap.get(report.targetId) ?? null,
      })),
    };
  }

  async moderateCommunityPost(
    id: string,
    payload: Partial<{
      hidden: boolean;
      locked: boolean;
    }>,
  ) {
    const existing = await this.prisma.communityPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Community post not found');
    }

    const post = await this.prisma.communityPost.update({
      where: { id },
      data: payload,
    });

    if (payload.hidden === true) {
      await this.prisma.communityReport.updateMany({
        where: {
          targetType: 'POST',
          targetId: id,
          resolvedAt: null,
        },
        data: {
          resolvedAt: new Date(),
        },
      });
    }

    return { post };
  }

  async moderateCommunityReply(id: string, payload: { hidden: boolean }) {
    const existing = await this.prisma.communityReply.findUnique({
      where: { id },
      select: { id: true, hidden: true, postId: true },
    });

    if (!existing) {
      throw new NotFoundException('Community reply not found');
    }

    const reply = await this.prisma.communityReply.update({
      where: { id },
      data: payload,
    });

    if (existing.hidden !== payload.hidden) {
      await this.prisma.communityPost.update({
        where: { id: existing.postId },
        data: {
          replyCount: {
            increment: payload.hidden ? -1 : 1,
          },
        },
      });
    }

    if (payload.hidden) {
      await this.prisma.communityReport.updateMany({
        where: {
          targetType: 'REPLY',
          targetId: id,
          resolvedAt: null,
        },
        data: {
          resolvedAt: new Date(),
        },
      });
    }

    return { reply };
  }

  async resolveCommunityReport(id: string) {
    const report = await this.prisma.communityReport.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Community report not found');
    }

    const resolvedReport = await this.prisma.communityReport.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
      },
    });

    return { report: resolvedReport };
  }
}
