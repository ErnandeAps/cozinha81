import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { DocumentoService, type DocumentoRow } from './documento.service';

@Controller('backoffice/documentos')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  @Post('cozinha/:cozinhaId')
  @UseInterceptors(FileInterceptor('file'))
  anexar(
    @Param('cozinhaId') cozinhaId: string,
    @Body('tipo') tipo: string,
    @Body('validade') validade: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer }
  ): Promise<DocumentoRow> {
    if (!tipo || !validade || !file) {
      throw new BadRequestException('tipo, validade e arquivo são obrigatórios.');
    }
    return this.documentoService.anexar(cozinhaId, tipo, validade, file);
  }

  @Get('cozinha/:cozinhaId')
  listarPorCozinha(@Param('cozinhaId') cozinhaId: string): Promise<DocumentoRow[]> {
    return this.documentoService.listarPorCozinha(cozinhaId);
  }

  @Delete(':id')
  remover(@Param('id') id: string): Promise<void> {
    return this.documentoService.remover(id);
  }
}
