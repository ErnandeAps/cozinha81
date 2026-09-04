import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { CozinhaService, type CozinhaRow } from './cozinha.service';
import type { CriarCozinhaDto, AtualizarCozinhaDto } from './cozinha.dto';

@Controller('backoffice/cozinhas')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class CozinhaController {
  constructor(private readonly cozinhaService: CozinhaService) {}

  @Post()
  criar(@Body() body: CriarCozinhaDto): Promise<CozinhaRow> {
    return this.cozinhaService.criar(body);
  }

  @Get()
  listar(): Promise<CozinhaRow[]> {
    return this.cozinhaService.listar();
  }

  @Get(':id')
  obter(@Param('id') id: string): Promise<CozinhaRow> {
    return this.cozinhaService.obter(id);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: AtualizarCozinhaDto): Promise<CozinhaRow> {
    return this.cozinhaService.atualizar(id, body);
  }

  @Delete(':id')
  remover(@Param('id') id: string): Promise<void> {
    return this.cozinhaService.remover(id);
  }
}
