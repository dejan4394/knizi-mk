import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

@Module({
  controllers: [],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
