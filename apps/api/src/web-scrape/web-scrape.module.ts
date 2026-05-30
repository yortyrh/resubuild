import { Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { WebScrapeController } from './web-scrape.controller';
import { WebScrapeRepository } from './web-scrape.repository';
import { WebScrapeService } from './web-scrape.service';

@Module({
  imports: [CvModule],
  controllers: [WebScrapeController],
  providers: [WebScrapeRepository, WebScrapeService],
  exports: [WebScrapeService],
})
export class WebScrapeModule {}
