import { Global, Module } from '@nestjs/common';
import { ImportModelsCatalogService } from './import-models-catalog.service';

@Global()
@Module({
  providers: [ImportModelsCatalogService],
  exports: [ImportModelsCatalogService],
})
export class ImportModelsCatalogModule {}
