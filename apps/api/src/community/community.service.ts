import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  type CommunityCategory,
  type CommunityReportReason,
  type CommunityReportTarget,
  type CropSeasonStatus,
} from '../generated/prisma';

import type { AuthUser } from '../common/types/authenticated-request';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

type FeedScope = 'FOR_YOU' | 'NEARBY' | 'TRENDING' | 'MY_POSTS' | 'SAVED';

type FeedQuery = {
  scope?: FeedScope;
  category?: CommunityCategory;
  cursor?: string;
  query?: string;
};

type CreatePostInput = {
  category: CommunityCategory;
  title: string;
  body: string;
  cropSeasonId?: string;
};

type CreateReplyInput = {
  body: string;
};

type ReportInput = {
  reason: CommunityReportReason;
  note?: string;
};

type ViewerContext = {
  defaultScope: FeedScope;
  cropNames: Set<string>;
  stages: Set<string>;
  village: string | null;
  district: string | null;
  state: string | null;
};

const COMMUNITY_PAGE_SIZE = 12;
const COMMUNITY_CANDIDATE_LIMIT = 80;

type CommunityPostRecord = Prisma.CommunityPostGetPayload<{
  include: {
    author: true;
    likes: {
      select: {
        id: true;
      };
    };
    saves: {
      select: {
        id: true;
      };
    };
  };
}>;

type CommunityPostDetailRecord = Prisma.CommunityPostGetPayload<{
  include: {
    author: true;
    likes: {
      select: {
        id: true;
      };
    };
    saves: {
      select: {
        id: true;
      };
    };
    replies: {
      include: {
        author: true;
      };
    };
  };
}>;

type CommunityReplyRecord = Prisma.CommunityReplyGetPayload<{
  include: {
    author: true;
  };
}>;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listFeed(viewer: AuthUser, query: FeedQuery) {
    const viewerContext = await this.loadViewerContext(viewer.sub);
    const appliedScope = query.scope ?? viewerContext.defaultScope;
    const where = this.buildFeedWhere(viewer.sub, appliedScope, query);
    const candidatePosts = await this.prisma.communityPost.findMany({
      where,
      include: buildViewerPostInclude(viewer.sub),
      orderBy: [{ createdAt: 'desc' }],
      take: COMMUNITY_CANDIDATE_LIMIT,
    });

    const rankedPosts = [...candidatePosts].sort((left, right) =>
      this.comparePosts(left, right, appliedScope, viewerContext),
    );
    const hasMore = rankedPosts.length > COMMUNITY_PAGE_SIZE;
    const posts = rankedPosts.slice(0, COMMUNITY_PAGE_SIZE);
    const lastPost = posts[posts.length - 1];

    return {
      scope: appliedScope,
      nextCursor: hasMore && lastPost ? lastPost.createdAt.toISOString() : null,
      posts: posts.map((post) => mapCommunityPost(post)),
    };
  }

  listMyPosts(viewer: AuthUser, query: FeedQuery) {
    return this.listFeed(viewer, {
      ...query,
      scope: 'MY_POSTS',
    });
  }

  async getPost(viewer: AuthUser, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        ...buildViewerPostInclude(viewer.sub),
        replies: {
          where: viewer.role === 'ADMIN' ? undefined : { hidden: false },
          include: {
            author: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post || (post.hidden && viewer.role !== 'ADMIN' && post.authorId !== viewer.sub)) {
      throw new NotFoundException('Community post not found');
    }

    return {
      post: mapCommunityPostDetail(post),
    };
  }

  async createPost(
    viewer: AuthUser,
    payload: CreatePostInput,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: viewer.sub },
      select: {
        id: true,
        name: true,
        profilePhotoUrl: true,
        village: true,
        district: true,
        state: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Farmer profile not found');
    }

    const seasonContext = payload.cropSeasonId
      ? await this.prisma.cropSeason.findFirst({
          where: {
            id: payload.cropSeasonId,
            farmPlot: {
              userId: viewer.sub,
            },
          },
          include: {
            farmPlot: {
              select: {
                village: true,
                district: true,
                state: true,
              },
            },
          },
        })
      : null;

    if (payload.cropSeasonId && !seasonContext) {
      throw new NotFoundException('Crop season not found');
    }

    const imageUrl = file
      ? await this.storageService.saveFile(file, 'community-posts')
      : null;
    const locationSnapshot = {
      village: seasonContext?.farmPlot.village ?? user.village ?? null,
      district: seasonContext?.farmPlot.district ?? user.district ?? null,
      state: seasonContext?.farmPlot.state ?? user.state ?? null,
    };

    const post = await this.prisma.communityPost.create({
      data: {
        authorId: viewer.sub,
        title: payload.title.trim(),
        body: payload.body.trim(),
        category: payload.category,
        cropSeasonId: seasonContext?.id,
        cropName: seasonContext?.cropName ?? null,
        currentStage: seasonContext?.currentStage ?? null,
        imageUrl,
        village: locationSnapshot.village,
        district: locationSnapshot.district,
        state: locationSnapshot.state,
      },
      include: {
        author: true,
      },
    });

    return {
      post: {
        ...mapCommunityPost({
          ...post,
          likes: [],
          saves: [],
        }),
        replies: [],
      },
    };
  }

  async createReply(viewer: AuthUser, postId: string, payload: CreateReplyInput) {
    const author = await this.prisma.user.findUnique({
      where: { id: viewer.sub },
      select: {
        id: true,
        name: true,
        profilePhotoUrl: true,
        village: true,
        district: true,
        state: true,
      },
    });

    if (!author) {
      throw new NotFoundException('Farmer profile not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.communityPost.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!post || post.hidden) {
        throw new NotFoundException('Community post not found');
      }

      if (post.locked) {
        throw new BadRequestException('This discussion is locked');
      }

      const reply = await tx.communityReply.create({
        data: {
          postId: post.id,
          authorId: viewer.sub,
          body: payload.body.trim(),
        },
        include: {
          author: true,
        },
      });

      await tx.communityPost.update({
        where: { id: post.id },
        data: {
          replyCount: {
            increment: 1,
          },
          lastActivityAt: new Date(),
        },
      });

      if (post.authorId !== viewer.sub) {
        await tx.alert.create({
          data: {
            userId: post.authorId,
            cropSeasonId: post.cropSeasonId,
            title: 'New community reply',
            message: `${getFirstName(author.name)} replied to "${post.title}".`,
            alertType: 'COMMUNITY',
            severity: 'LOW',
            ctaRoute: `/community/post/${post.id}`,
          },
        });
      }

      return {
        postId: post.id,
        postAuthorId: post.authorId,
        reply,
      };
    });

    if (result.postAuthorId !== viewer.sub) {
      this.notificationsService.publishInternalEvent('community.reply.created', {
        postId: result.postId,
        repliedBy: viewer.sub,
        targetUserId: result.postAuthorId,
      });
    }

    return {
      reply: mapCommunityReply(result.reply),
    };
  }

  async toggleLike(viewer: AuthUser, postId: string) {
    const post = await this.toggleCommunityEngagement(viewer, postId, 'like');

    return {
      post: mapCommunityPost(post),
    };
  }

  async toggleSave(viewer: AuthUser, postId: string) {
    const post = await this.toggleCommunityEngagement(viewer, postId, 'save');

    return {
      post: mapCommunityPost(post),
    };
  }

  async reportPost(viewer: AuthUser, postId: string, payload: ReportInput) {
    return this.createReport(viewer.sub, 'POST', postId, payload);
  }

  async reportReply(viewer: AuthUser, replyId: string, payload: ReportInput) {
    return this.createReport(viewer.sub, 'REPLY', replyId, payload);
  }

  private buildFeedWhere(
    userId: string,
    scope: FeedScope,
    query: FeedQuery,
  ): Prisma.CommunityPostWhereInput {
    const trimmedQuery = query.query?.trim();
    const cursorDate = parseCursorDate(query.cursor);

    return {
      ...(scope === 'MY_POSTS'
        ? { authorId: userId }
        : scope === 'SAVED'
          ? {
              hidden: false,
              saves: {
                some: {
                  userId,
                },
              },
            }
          : {
              hidden: false,
            }),
      ...(query.category ? { category: query.category } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              {
                title: {
                  contains: trimmedQuery,
                  mode: 'insensitive',
                },
              },
              {
                body: {
                  contains: trimmedQuery,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(cursorDate
        ? {
            createdAt: {
              lt: cursorDate,
            },
          }
        : {}),
    };
  }

  private comparePosts(
    left: CommunityPostRecord,
    right: CommunityPostRecord,
    scope: FeedScope,
    viewerContext: ViewerContext,
  ) {
    const scoreDelta =
      this.scorePost(right, scope, viewerContext) - this.scorePost(left, scope, viewerContext);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  }

  private scorePost(post: CommunityPostRecord, scope: FeedScope, viewerContext: ViewerContext) {
    const ageHours = Math.max(
      1,
      (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60),
    );
    const cropMatch = viewerContext.cropNames.has(normalize(post.cropName));
    const stageMatch = viewerContext.stages.has(normalize(post.currentStage));
    const sameVillage =
      viewerContext.village != null &&
      normalize(viewerContext.village) === normalize(post.village);
    const sameDistrict =
      viewerContext.district != null &&
      normalize(viewerContext.district) === normalize(post.district);
    const sameState =
      viewerContext.state != null &&
      normalize(viewerContext.state) === normalize(post.state);

    if (scope === 'FOR_YOU') {
      return (
        (cropMatch ? 120 : 0) +
        (stageMatch ? 45 : 0) +
        (sameVillage ? 24 : 0) +
        (sameDistrict ? 18 : 0) +
        (sameState ? 10 : 0) +
        post.replyCount * 2 +
        post.likeCount * 1.5 -
        ageHours * 0.6
      );
    }

    if (scope === 'NEARBY') {
      return (
        (sameVillage ? 120 : 0) +
        (sameDistrict ? 50 : 0) +
        (sameState ? 20 : 0) +
        (cropMatch ? 12 : 0) +
        post.replyCount * 1.5 +
        post.likeCount -
        ageHours * 0.7
      );
    }

    if (scope === 'TRENDING') {
      return (
        post.replyCount * 12 +
        post.likeCount * 6 -
        post.reportCount * 18 -
        ageHours * 0.45
      );
    }

    if (scope === 'SAVED') {
      return post.likeCount * 2 + post.replyCount * 2 - ageHours * 0.35;
    }

    return post.replyCount * 2 + post.likeCount - ageHours * 0.5;
  }

  private async loadViewerContext(userId: string): Promise<ViewerContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        state: true,
        district: true,
        village: true,
        farmPlots: {
          select: {
            state: true,
            district: true,
            village: true,
            cropSeasons: {
              select: {
                cropName: true,
                currentStage: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Farmer profile not found');
    }

    const operationalSeasons = user.farmPlots.flatMap((farm) =>
      farm.cropSeasons.filter((season) => isOperationalSeason(season.status)),
    );
    const scopedSeasons =
      operationalSeasons.filter((season) => season.status === 'ACTIVE').length > 0
        ? operationalSeasons.filter((season) => season.status === 'ACTIVE')
        : operationalSeasons.filter((season) => season.status === 'PLANNED');
    const fallbackFarm = user.farmPlots[0];

    return {
      defaultScope: scopedSeasons.length > 0 ? 'FOR_YOU' : 'NEARBY',
      cropNames: new Set(scopedSeasons.map((season) => normalize(season.cropName))),
      stages: new Set(scopedSeasons.map((season) => normalize(season.currentStage))),
      village: user.village ?? fallbackFarm?.village ?? null,
      district: user.district ?? fallbackFarm?.district ?? null,
      state: user.state ?? fallbackFarm?.state ?? null,
    };
  }

  private async toggleCommunityEngagement(
    viewer: AuthUser,
    postId: string,
    type: 'like' | 'save',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.communityPost.findUnique({
        where: { id: postId },
        include: buildViewerPostInclude(viewer.sub),
      });

      if (!post || (post.hidden && viewer.role !== 'ADMIN' && post.authorId !== viewer.sub)) {
        throw new NotFoundException('Community post not found');
      }

      const existingRecords = type === 'like' ? post.likes : post.saves;
      const hasExistingRecord = existingRecords.length > 0;

      if (type === 'like') {
        if (hasExistingRecord) {
          await tx.communityPostLike.deleteMany({
            where: {
              postId,
              userId: viewer.sub,
            },
          });
        } else {
          await tx.communityPostLike.create({
            data: {
              postId,
              userId: viewer.sub,
            },
          });
        }
      } else {
        if (hasExistingRecord) {
          await tx.communityPostSave.deleteMany({
            where: {
              postId,
              userId: viewer.sub,
            },
          });
        } else {
          await tx.communityPostSave.create({
            data: {
              postId,
              userId: viewer.sub,
            },
          });
        }
      }

      await tx.communityPost.update({
        where: { id: postId },
        data:
          type === 'like'
            ? {
                likeCount: {
                  increment: hasExistingRecord ? -1 : 1,
                },
              }
            : {
                saveCount: {
                  increment: hasExistingRecord ? -1 : 1,
                },
              },
      });

      const updatedPost = await tx.communityPost.findUnique({
        where: { id: postId },
        include: buildViewerPostInclude(viewer.sub),
      });

      if (!updatedPost) {
        throw new NotFoundException('Community post not found');
      }

      return updatedPost;
    });
  }

  private async createReport(
    reporterId: string,
    targetType: CommunityReportTarget,
    targetId: string,
    payload: ReportInput,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (targetType === 'POST') {
          const post = await tx.communityPost.findUnique({
            where: { id: targetId },
            select: { id: true },
          });

          if (!post) {
            throw new NotFoundException('Community post not found');
          }

          await tx.communityReport.create({
            data: {
              reporterId,
              targetType,
              targetId,
              reason: payload.reason,
              note: payload.note?.trim() || null,
            },
          });

          await tx.communityPost.update({
            where: { id: targetId },
            data: {
              reportCount: {
                increment: 1,
              },
            },
          });
        } else {
          const reply = await tx.communityReply.findUnique({
            where: { id: targetId },
            select: { id: true },
          });

          if (!reply) {
            throw new NotFoundException('Community reply not found');
          }

          await tx.communityReport.create({
            data: {
              reporterId,
              targetType,
              targetId,
              reason: payload.reason,
              note: payload.note?.trim() || null,
            },
          });

          await tx.communityReply.update({
            where: { id: targetId },
            data: {
              reportCount: {
                increment: 1,
              },
            },
          });
        }

        return {
          success: true,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('You already reported this content');
      }

      throw error;
    }
  }
}

function buildViewerPostInclude(userId: string) {
  return {
    author: true,
    likes: {
      where: {
        userId,
      },
      select: {
        id: true,
      },
    },
    saves: {
      where: {
        userId,
      },
      select: {
        id: true,
      },
    },
  } satisfies Prisma.CommunityPostInclude;
}

function mapCommunityPost(post: CommunityPostRecord) {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    category: post.category,
    cropSeasonId: post.cropSeasonId,
    cropName: post.cropName,
    currentStage: post.currentStage,
    imageUrl: post.imageUrl,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    saveCount: post.saveCount,
    locked: post.locked,
    viewerHasLiked: post.likes.length > 0,
    viewerHasSaved: post.saves.length > 0,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: {
      firstName: getFirstName(post.author.name),
      profilePhotoUrl: post.author.profilePhotoUrl,
      village: post.village ?? post.author.village,
      district: post.district ?? post.author.district,
      state: post.state ?? post.author.state,
    },
  };
}

function mapCommunityReply(reply: CommunityReplyRecord) {
  return {
    id: reply.id,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    author: {
      firstName: getFirstName(reply.author.name),
      profilePhotoUrl: reply.author.profilePhotoUrl,
      village: reply.author.village,
      district: reply.author.district,
      state: reply.author.state,
    },
  };
}

function mapCommunityPostDetail(post: CommunityPostDetailRecord) {
  return {
    ...mapCommunityPost(post),
    replies: post.replies.map((reply) => mapCommunityReply(reply)),
  };
}

function getFirstName(value?: string | null) {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return 'Farmer';
  }

  return trimmed.split(/\s+/)[0] ?? 'Farmer';
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function parseCursorDate(cursor?: string) {
  if (!cursor) {
    return null;
  }

  const date = new Date(cursor);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOperationalSeason(status: CropSeasonStatus) {
  return status === 'ACTIVE' || status === 'PLANNED';
}
