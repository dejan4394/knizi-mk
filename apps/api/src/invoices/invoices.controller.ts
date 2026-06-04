import {
  Controller,
  Get,
  Post,
  Body,
  // Patch,
  Param,
  UseGuards,
  Req,
  Res,
  Patch,
  ParseIntPipe,
  // Delete,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { PdfService } from 'src/pdf/pdf.service';
// import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import express from 'express'; // <--- ОВА Е КЛУЧНОТО! Мора да е од 'express'
import { InvoiceItem } from './entities/invoice-item.entity';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { Invoice } from './entities/invoice.entity';

interface AuthenticatedUser {
  userId: number;
  email: string;
  role: string;
  companyId: number;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
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

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.invoicesService.remove(+id);
  // }

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
}
