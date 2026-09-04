import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { UsuarioService } from './usuario.service';
import type { CriarUsuarioDto, UsuarioExibicao } from './usuario.dto';

@Controller('backoffice/usuarios')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get()
  listar(): Promise<UsuarioExibicao[]> {
    return this.usuarioService.listar();
  }

  @Post()
  criar(@Body() body: CriarUsuarioDto): Promise<UsuarioExibicao> {
    return this.usuarioService.criar(body);
  }

  @Get(':id')
  obter(@Param('id') id: string): Promise<UsuarioExibicao> {
    return this.usuarioService.obter(id);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: Partial<CriarUsuarioDto>): Promise<UsuarioExibicao> {
    return this.usuarioService.atualizar(id, body);
  }

  @Delete(':id')
  remover(@Param('id') id: string): Promise<void> {
    return this.usuarioService.remover(id);
  }
}
