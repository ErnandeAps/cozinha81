-- Normaliza valores legados do centro de custo para reais.
-- Registros antigos foram gravados em centavos; a regra atual do backoffice usa reais inteiros.
UPDATE centro_custo
SET
  investimento_inicial = investimento_inicial / 100,
  custos_fixos_mensais = custos_fixos_mensais / 100,
  reserva_manutencao = reserva_manutencao / 100,
  aluguel_mensal = aluguel_mensal / 100,
  taxa_administracao = taxa_administracao / 100,
  equipamentos = equipamentos / 100,
  servicos = servicos / 100,
  condominio = condominio / 100,
  seguranca = seguranca / 100,
  manutencao = manutencao / 100,
  outros = outros / 100
WHERE
  investimento_inicial > 0
  OR custos_fixos_mensais > 0
  OR reserva_manutencao > 0
  OR aluguel_mensal > 0
  OR taxa_administracao > 0
  OR equipamentos > 0
  OR servicos > 0
  OR condominio > 0
  OR seguranca > 0
  OR manutencao > 0
  OR outros > 0;
