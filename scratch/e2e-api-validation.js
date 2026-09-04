const API_BASE = 'http://localhost:3000/api';

async function runE2E() {
  console.log('🚀 Iniciando Validação E2E programática...');

  try {
    // 1. Login do Staff de Plataforma
    console.log('\n[Passo 1] Efetuando login do staff de plataforma...');
    const loginRes = await fetch(`${API_BASE}/backoffice/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ops@cozinha81', senha: 'SenhaForte!23' }),
    });

    if (!loginRes.ok) {
      throw new Error(`Falha no login do staff: ${loginRes.status} ${await loginRes.text()}`);
    }

    const { accessToken: staffToken } = await loginRes.json();
    console.log('✅ Staff autenticado com sucesso!');

    const staffHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    };

    // 2. Criar um Inquilino para testes
    console.log('\n[Passo 2] Provisionando novo inquilino...');
    const tenantEmail = `owner-${Date.now()}@test.com`;
    const tenantRes = await fetch(`${API_BASE}/backoffice/inquilinos`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        nome: 'Cozinha Teste E2E Ltda',
        dono: {
          email: tenantEmail,
          nome: 'Dono Teste E2E',
        },
        modulos: ['gestao_cozinha', 'pedidos_kds'],
      }),
    });

    if (!tenantRes.ok) {
      throw new Error(`Falha ao provisionar inquilino: ${tenantRes.status} ${await tenantRes.text()}`);
    }

    const tenantData = await tenantRes.json();
    const tenantId = tenantData.tenantId;
    const inviteToken = tenantData.conviteDono.token;
    console.log(`✅ Inquilino provisionado! ID: ${tenantId}`);

    // 3. Ativar o Dono do Inquilino usando o token de convite
    console.log('\n[Passo 3] Aceitando convite do Dono...');
    const acceptRes = await fetch(`${API_BASE}/portal/usuarios/convites/aceitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken, senha: 'SenhaSegura!123' }),
    });

    if (!acceptRes.ok) {
      throw new Error(`Falha ao aceitar convite: ${acceptRes.status} ${await acceptRes.text()}`);
    }
    console.log('✅ Convite do dono aceito e senha definida!');

    // 4. Login do Dono do Inquilino no Portal
    console.log('\n[Passo 4] Efetuando login do dono do inquilino...');
    const portalLoginRes = await fetch(`${API_BASE}/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tenantEmail, senha: 'SenhaSegura!123' }),
    });

    if (!portalLoginRes.ok) {
      throw new Error(`Falha no login do dono: ${portalLoginRes.status} ${await portalLoginRes.text()}`);
    }

    const { accessToken: tenantToken } = await portalLoginRes.json();
    console.log('✅ Dono autenticado no Portal!');

    const tenantHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tenantToken}`,
    };

    // 5. Cadastrar uma Cozinha (Staff)
    console.log('\n[Passo 5] Cadastrando uma nova unidade física de Cozinha...');
    const cozinhaRes = await fetch(`${API_BASE}/backoffice/cozinhas`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        nome: `Cozinha E2E ${Date.now()}`,
        equipada: true,
      }),
    });

    if (!cozinhaRes.ok) {
      throw new Error(`Falha ao cadastrar cozinha: ${cozinhaRes.status} ${await cozinhaRes.text()}`);
    }

    const cozinha = await cozinhaRes.json();
    const cozinhaId = cozinha.id;
    console.log(`✅ Cozinha cadastrada! ID: ${cozinhaId}`);

    // 6. Cadastrar uma Reserva de Slot na Cozinha (Staff)
    console.log('\n[Passo 6] Agendando uma reserva de slot para o inquilino...');
    const reservaRes = await fetch(`${API_BASE}/backoffice/reservas`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        cozinhaId: cozinhaId,
        tenantId: tenantId,
        modalidade: 'turno',
        inicio: '2026-07-01T08:00:00.000Z',
        fim: '2026-07-01T12:00:00.000Z',
      }),
    });

    if (!reservaRes.ok) {
      throw new Error(`Falha ao cadastrar reserva: ${reservaRes.status} ${await reservaRes.text()}`);
    }

    const reserva = await reservaRes.json();
    console.log(`✅ Reserva criada com sucesso! ID: ${reserva.id}`);

    // 7. Registrar presença (Check-in / Check-out com checklist) (Inquilino)
    console.log('\n[Passo 7] Registrando check-in de presença com checklist...');
    const presencaRes = await fetch(`${API_BASE}/backoffice/presencas`, {
      method: 'POST',
      headers: tenantHeaders,
      body: JSON.stringify({
        cozinhaId: cozinhaId,
        tenantId: tenantId,
        tipo: 'in',
        checklist: {
          limpeza: true,
          equipamento: true,
          observacoes: 'Tudo limpo e higienizado',
        },
      }),
    });

    if (!presencaRes.ok) {
      throw new Error(`Falha ao registrar check-in: ${presencaRes.status} ${await presencaRes.text()}`);
    }
    console.log('✅ Check-in registrado com checklist estruturado!');

    // 8. Cadastrar Material no Catálogo (Staff)
    console.log('\n[Passo 8] Cadastrando insumo no catálogo de materiais...');
    const materialRes = await fetch(`${API_BASE}/backoffice/materiais`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({ nome: 'Papel Toalha E2E' }),
    });

    if (!materialRes.ok) {
      throw new Error(`Falha ao cadastrar material: ${materialRes.status} ${await materialRes.text()}`);
    }

    const material = await materialRes.json();
    const materialId = material.id;
    console.log(`✅ Material cadastrado! ID: ${materialId}`);

    // 9. Registrar Entrada em Estoque (Reabastecimento)
    console.log('\n[Passo 9] Registrando entrada de estoque (reabastecimento)...');
    const entradaRes = await fetch(`${API_BASE}/backoffice/materiais/movimento`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        materialId: materialId,
        tipo: 'entrada',
        quantidade: 100,
      }),
    });

    if (!entradaRes.ok) {
      throw new Error(`Falha ao registrar entrada: ${entradaRes.status} ${await entradaRes.text()}`);
    }
    console.log('✅ Entrada de estoque registrada!');

    // 10. Registrar Consumo de Material pelo Inquilino
    console.log('\n[Passo 10] Registrando consumo do material pelo inquilino...');
    const consumoRes = await fetch(`${API_BASE}/backoffice/materiais/movimento`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        materialId: materialId,
        tipo: 'consumo',
        quantidade: 10,
        valorUnitario: 500, // R$ 5,00 em centavos
        tenantId: tenantId,
      }),
    });

    if (!consumoRes.ok) {
      throw new Error(`Falha ao registrar consumo: ${consumoRes.status} ${await consumoRes.text()}`);
    }
    console.log('✅ Consumo do inquilino registrado no ledger!');

    // 11. Gerar Fatura Consolidada (Staff)
    console.log('\n[Passo 11] Gerando fatura consolidada...');
    const faturaRes = await fetch(`${API_BASE}/backoffice/billing/gerar`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({
        tenantId: tenantId,
        inicio: '2026-06-25T00:00:00.000Z',
        fim: '2026-07-10T23:59:59.000Z',
      }),
    });

    if (!faturaRes.ok) {
      throw new Error(`Falha ao gerar fatura: ${faturaRes.status} ${await faturaRes.text()}`);
    }

    const fatura = await faturaRes.json();
    console.log(`✅ Fatura consolidada gerada! ID: ${fatura.id}`);
    console.log('Detalhes da Fatura:');
    console.log(`- Valor Total: R$ ${fatura.valor_total / 100}`);
    console.log('Itens inclusos:');
    fatura.itens.forEach((item) => {
      console.log(`  * [${item.tipo.toUpperCase()}] ${item.descricao}: R$ ${item.valor / 100}`);
    });

    // 12. Pagar a Fatura
    console.log('\n[Passo 12] Efetuando pagamento da fatura...');
    const pagarRes = await fetch(`${API_BASE}/backoffice/billing/${fatura.id}/pagar`, {
      method: 'POST',
      headers: staffHeaders,
    });

    if (!pagarRes.ok) {
      throw new Error(`Falha ao pagar fatura: ${pagarRes.status} ${await pagarRes.text()}`);
    }

    const faturaPaga = await pagarRes.json();
    console.log(`✅ Fatura quitada com sucesso! Status atual: ${faturaPaga.status}`);

    console.log('\n⭐ VALIDAÇÃO E2E PROGRAMÁTICA CONCLUÍDA COM SUCESSO! ⭐');
  } catch (error) {
    console.error('\n❌ ERRO NA VALIDAÇÃO E2E:', error.message);
    process.exit(1);
  }
}

runE2E();
