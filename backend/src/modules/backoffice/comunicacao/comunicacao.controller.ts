import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { ComunicacaoService } from './comunicacao.service';
import type { ComunicacaoRow, CriarComunicacaoDto } from './comunicacao.dto';

@Controller('backoffice/comunicacao')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class ComunicacaoController {
  constructor(private readonly comunicacaoService: ComunicacaoService) {}

  @Get()
  listar(): Promise<ComunicacaoRow[]> {
    return this.comunicacaoService.listar();
  }

  @Post()
  criar(@Body() body: CriarComunicacaoDto): Promise<ComunicacaoRow> {
    return this.comunicacaoService.criar(body);
  }
}
