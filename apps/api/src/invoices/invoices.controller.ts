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
      console.log(companyId, 'company id');

      const dbInvoice = await this.invoicesService.findOne(Number(id));

      if (!dbInvoice) {
        return res.status(404).json({ message: 'Фактурата не е пронајдена.' });
      }

      if (dbInvoice.companyId !== companyId) {
        return res
          .status(403)
          .json({ message: 'Немате овластување за овој документ.' });
      }

      const invoiceDataForTemplate = {
        invoiceNumber: dbInvoice.invoiceNo,
        companyName: dbInvoice.company?.name || 'Моја Компанија',
        companyEdb: dbInvoice.company?.edb || '',
        companyAddress: dbInvoice.company?.address || '',
        companyPhone: dbInvoice.company?.phone || '',
        companyEmail: dbInvoice.company?.email || '',
        companyBank: dbInvoice.company?.bankName || '',
        clientName: dbInvoice.client?.name || 'Непознат Клиент',
        clientEdb: dbInvoice.client?.edb || '',
        clientAddress: dbInvoice.client?.address || '',
        date: new Date(dbInvoice.created_at).toLocaleDateString('mk-MK'),
        dueDate: dbInvoice.dueDate
          ? new Date(dbInvoice.dueDate).toLocaleDateString('mk-MK')
          : '',

        items: dbInvoice.items.map((item: InvoiceItem, index: number) => {
          const quantity = Number(item.quantity);
          const price = Number(item.price);
          const discountPercent = Number(item.discountPercent ?? 0); // Пази: ?? наместо || за да не ја голтне нулата
          const vatRate = Number(item.vatRate ?? 18);

          // Пресметка на цената по ставка со вклучен попуст
          const priceAfterDiscount = price * (1 - discountPercent / 100);
          const itemSubtotal = priceAfterDiscount * quantity;

          return {
            rbr: index + 1,
            description: item.description || '',
            unitOfMeasure: item.unitOfMeasure || 'ПАР',
            quantity: quantity,

            price: price.toFixed(2),
            discountPercent: discountPercent > 0 ? `${discountPercent}%` : '/',
            priceWithDiscount: priceAfterDiscount.toFixed(2),
            itemSubtotal: itemSubtotal.toFixed(2),
            vatRate: `${vatRate}%`,
          };
        }),

        subtotalAmount: Number(dbInvoice.subtotalAmount || 0).toFixed(2),
        vatAmount: Number(dbInvoice.vatAmount || 0).toFixed(2),
        totalWithVat: Number(dbInvoice.totalWithVat || 0).toFixed(2),
        roundingAmount: Number(dbInvoice.roundingAmount || 0).toFixed(2),
        finalPayable: Number(dbInvoice.finalPayable || 0),
      };

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
}
