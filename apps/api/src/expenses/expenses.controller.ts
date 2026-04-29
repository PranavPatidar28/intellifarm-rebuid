import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  createExpenseSchema,
  expenseBudgetUpsertSchema,
  expenseListQuerySchema,
  expenseSummaryQuerySchema,
  updateExpenseSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@UseGuards(AuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.expensesService.listExpenses(
      user.sub,
      parseWithSchema(expenseListQuerySchema, query),
    );
  }

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.expensesService.getSummary(
      user.sub,
      parseWithSchema(expenseSummaryQuerySchema, query),
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('receipt'))
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.expensesService.createExpense(
      user.sub,
      parseWithSchema(createExpenseSchema, body),
      file,
    );
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('receipt'))
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.expensesService.updateExpense(
      user.sub,
      id,
      parseWithSchema(updateExpenseSchema, body),
      file,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expensesService.deleteExpense(user.sub, id);
  }

  @Put('budget')
  upsertBudget(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ) {
    return this.expensesService.upsertBudget(
      user.sub,
      parseWithSchema(expenseBudgetUpsertSchema, body),
    );
  }
}
