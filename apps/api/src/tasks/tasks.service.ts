import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(userId: string, cropSeasonId?: string) {
    const tasks = await this.prisma.cropTask.findMany({
      where: {
        cropSeason: {
          farmPlot: {
            userId,
          },
        },
        ...(cropSeasonId ? { cropSeasonId } : {}),
      },
      orderBy: [{ dueDate: 'asc' }],
    });

    return { tasks };
  }

  async updateTaskStatus(
    userId: string,
    taskId: string,
    payload: { status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE' },
  ) {
    const task = await this.prisma.cropTask.findFirst({
      where: {
        id: taskId,
        cropSeason: {
          farmPlot: {
            userId,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updatedTask = await this.prisma.cropTask.update({
      where: { id: taskId },
      data: { status: payload.status },
    });

    return { task: updatedTask };
  }
}
