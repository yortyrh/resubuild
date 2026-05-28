import { IsUUID } from 'class-validator';

export class SetActiveAiAgentAccountDto {
  @IsUUID('4')
  accountId!: string;
}
