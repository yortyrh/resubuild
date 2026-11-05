import { IsIn, IsOptional, IsUUID, ValidateIf } from 'class-validator';

/** Select one of the user's accounts (`accountId`) or the included models (`source: 'included'`). */
export class SetActiveAiAgentAccountDto {
  @ValidateIf((dto: SetActiveAiAgentAccountDto) => dto.source !== 'included')
  @IsUUID('4')
  accountId?: string;

  @IsOptional()
  @IsIn(['account', 'included'])
  source?: 'account' | 'included';
}
