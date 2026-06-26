import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { PdfService } from 'src/pdf/pdf.service';
import express from 'express';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { DocumentType, Invoice } from './entities/invoice.entity';
import { DataSource } from 'typeorm';

// --- НОВИОТ УВОЗ ОД ГЛОБАЛНОТО МЕСТО ---
import type { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = req.user.companyId;
    return this.invoicesService.create(createInvoiceDto, companyId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE, UserRole.VIEWER)
  findAll(@Req() req: AuthenticatedRequest) {
    const companyId = req.user.companyId;
    return this.invoicesService.findAllForCompany(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  async downloadInvoicePdf(
    @Param('id') id: string,
    @Res() res: express.Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const companyId = req.user.companyId;
      const dbInvoice = await this.invoicesService.findOne(Number(id));

      if (!dbInvoice) {
        return res.status(404).json({ message: 'Фактурата не е пронајдена.' });
      }

      if (dbInvoice.companyId !== companyId) {
        return res
          .status(403)
          .json({ message: 'Немате овластување за овој документ.' });
      }

      const invoiceDataForTemplate =
        this.invoicesService.mapInvoiceToTemplateData(dbInvoice);

      const pdfBuffer = await this.pdfService.generateInvoicePdf(
        invoiceDataForTemplate,
      );

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Faktura-${invoiceDataForTemplate.invoiceNumber}.pdf`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.end(pdfBuffer);
    } catch (error) {
      console.error('Грешка во контролерот за реална PDF фактура:', error);
      res
        .status(500)
        .json({ message: 'Грешка при генерирање на PDF од база.' });
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = req.user.companyId;
    return await this.invoicesService.update(
      Number(id),
      updateInvoiceDto,
      Number(companyId),
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
  ): Promise<Invoice> {
    return await this.invoicesService.updateStatus(id, updateStatusDto.status);
  }

  @Post(':id/send-email')
  @UseGuards(JwtAuthGuard)
  async sendInvoiceEmail(@Param('id', ParseIntPipe) id: number) {
    return await this.invoicesService.sendInvoiceToEmail(id);
  }

  @Post(':id/convert')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  async convertProforma(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = req.user.companyId;
    return await this.invoicesService.convertProformaToInvoice(id, companyId);
  }

  @Get('next-number/:type')
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  async getNextNumber(
    @Param('type') type: DocumentType,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = req.user.companyId;
    const currentYear = new Date().getFullYear();

    const nextNo = await this.invoicesService.getNextInvoiceNumber(
      this.dataSource.manager,
      companyId,
      currentYear,
      type,
    );

    return { nextInvoiceNumber: nextNo };
  }

  @Post(':id/sign')
  async signInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = req.user?.companyId || 1;

    return await this.invoicesService.signInvoiceWithKibs(id, companyId);
  }
}
