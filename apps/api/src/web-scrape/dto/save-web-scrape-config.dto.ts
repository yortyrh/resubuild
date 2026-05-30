import { IsIn, IsString, MinLength } from 'class-validator';

export class SaveWebScrapeConfigDto {
  @IsIn(['firecrawl', 'tavily'])
  provider!: 'firecrawl' | 'tavily';

  @IsString()
  @MinLength(8)
  apiKey!: string;
}
