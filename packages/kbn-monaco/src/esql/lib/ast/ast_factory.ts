/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type ShowInfoContext,
  type ShowFunctionsContext,
  type SingleStatementContext,
  type RowCommandContext,
  type FromCommandContext,
  type EvalCommandContext,
  type StatsCommandContext,
  type LimitCommandContext,
  type SortCommandContext,
  type KeepCommandContext,
  type DropCommandContext,
  type RenameCommandContext,
  type DissectCommandContext,
  type GrokCommandContext,
  type MvExpandCommandContext,
  type ShowCommandContext,
  type EnrichCommandContext,
  type WhereCommandContext,
  esql_parser,
} from '../../antlr/esql_parser';
import { esql_parserListener as ESQLParserListener } from '../../antlr/esql_parser_listener';
import { createCommand, createFunction, createOption, createLiteral } from './ast_helpers';
import { getPosition } from './ast_position_utils';
import {
  collectAllSourceIdentifiers,
  collectAllFieldsStatements,
  visitByOption,
  collectAllColumnIdentifiers,
  visitRenameClauses,
  visitDissect,
  visitGrok,
  collectBooleanExpression,
  visitOrderExpression,
  getPolicyName,
  getMatchField,
  getEnrichClauses,
  getPolicySettings,
} from './ast_walker';
import type { ESQLAst } from './types';

export class AstListener implements ESQLParserListener {
  private ast: ESQLAst = [];

  public getAst() {
    return { ast: this.ast };
  }

  /**
   * Exit a parse tree produced by the `showInfo`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowInfo(ctx: ShowInfoContext) {
    const commandAst = createCommand('show', ctx);

    this.ast.push(commandAst);
    commandAst.text = ctx.text;
    commandAst?.args.push(createFunction('info', ctx, getPosition(ctx.INFO().symbol)));
  }

  /**
   * Exit a parse tree produced by the `showFunctions`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowFunctions(ctx: ShowFunctionsContext) {
    const commandAst = createCommand('show', ctx);
    this.ast.push(commandAst);
    // update the text
    commandAst.text = ctx.text;
    commandAst?.args.push(createFunction('functions', ctx, getPosition(ctx.FUNCTIONS().symbol)));
  }

  /**
   * Enter a parse tree produced by `esql_parser.singleStatement`.
   * @param ctx the parse tree
   */
  enterSingleStatement(ctx: SingleStatementContext) {
    this.ast = [];
  }

  /**
   * Exit a parse tree produced by `esql_parser.whereCommand`.
   * @param ctx the parse tree
   */
  exitWhereCommand(ctx: WhereCommandContext) {
    const command = createCommand('where', ctx);
    this.ast.push(command);
    command.args.push(...collectBooleanExpression(ctx.booleanExpression()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  exitRowCommand(ctx: RowCommandContext) {
    const command = createCommand('row', ctx);
    this.ast.push(command);
    command.args.push(...collectAllFieldsStatements(ctx.fields()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  exitFromCommand(ctx: FromCommandContext) {
    const commandAst = createCommand('from', ctx);
    this.ast.push(commandAst);
    commandAst.args.push(...collectAllSourceIdentifiers(ctx));
    const metadataContext = ctx.metadata();
    if (metadataContext) {
      const option = createOption(metadataContext.METADATA().text.toLowerCase(), metadataContext);
      commandAst.args.push(option);
      option.args.push(...collectAllColumnIdentifiers(metadataContext));
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  exitEvalCommand(ctx: EvalCommandContext) {
    const commandAst = createCommand('eval', ctx);
    this.ast.push(commandAst);
    commandAst.args.push(...collectAllFieldsStatements(ctx.fields()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  exitStatsCommand(ctx: StatsCommandContext) {
    const command = createCommand('stats', ctx);
    this.ast.push(command);
    const fields = ctx.fields();
    // STATS expression is optional
    if (ctx._stats) {
      command.args.push(...collectAllFieldsStatements(fields[0]));
    }
    if (ctx._grouping) {
      command.args.push(...visitByOption(ctx, ctx._stats ? fields[1] : fields[0]));
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  exitLimitCommand(ctx: LimitCommandContext) {
    const command = createCommand('limit', ctx);
    this.ast.push(command);
    if (ctx.tryGetToken(esql_parser.INTEGER_LITERAL, 0)) {
      const literal = createLiteral('number', ctx.INTEGER_LITERAL());
      if (literal) {
        command.args.push(literal);
      }
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  exitSortCommand(ctx: SortCommandContext) {
    const command = createCommand('sort', ctx);
    this.ast.push(command);
    command.args.push(...visitOrderExpression(ctx.orderExpression()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  exitKeepCommand(ctx: KeepCommandContext) {
    const command = createCommand('keep', ctx);
    this.ast.push(command);
    command.args.push(...collectAllColumnIdentifiers(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  exitDropCommand(ctx: DropCommandContext) {
    const command = createCommand('drop', ctx);
    this.ast.push(command);
    command.args.push(...collectAllColumnIdentifiers(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  exitRenameCommand(ctx: RenameCommandContext) {
    const command = createCommand('rename', ctx);
    this.ast.push(command);
    command.args.push(...visitRenameClauses(ctx.renameClause()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  exitDissectCommand(ctx: DissectCommandContext) {
    const command = createCommand('dissect', ctx);
    this.ast.push(command);
    command.args.push(...visitDissect(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  exitGrokCommand(ctx: GrokCommandContext) {
    const command = createCommand('grok', ctx);
    this.ast.push(command);
    command.args.push(...visitGrok(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  exitMvExpandCommand(ctx: MvExpandCommandContext) {
    const command = createCommand('mv_expand', ctx);
    this.ast.push(command);
    command.args.push(...collectAllColumnIdentifiers(ctx));
  }

  /**
   * Enter a parse tree produced by `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  enterShowCommand(ctx: ShowCommandContext) {
    const command = createCommand('show', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  exitEnrichCommand(ctx: EnrichCommandContext) {
    const command = createCommand('enrich', ctx);
    this.ast.push(command);
    command.args.push(
      ...getPolicySettings(ctx),
      ...getPolicyName(ctx),
      ...getMatchField(ctx),
      ...getEnrichClauses(ctx)
    );
  }
}
