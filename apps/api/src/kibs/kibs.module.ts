import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KibsService } from './kibs.service';

@Module({
  imports: [HttpModule],
  providers: [KibsService],
  exports: [KibsService], // Го експортираме за да го користиш во InvoiceService подоцна
})
export class KibsModule {}
