import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateClosedCycleDraw } from '../api/_lib/draw';
import {
  createGroup,
  getGroupByCode,
  joinGroup,
  performGroupDraw,
  revealParticipantTarget,
  updateParticipantWishlist,
} from '../api/_lib/db';

describe('Algoritmo de Sorteio (Ciclo Fechado / Derangement)', () => {
  it('garante que ninguém tira a si mesmo e forma um único ciclo fechado', () => {
    const participants = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    for (let run = 0; run < 50; run++) {
      const pairs = generateClosedCycleDraw(participants);
      assert.equal(pairs.size, participants.length);

      for (const [giver, receiver] of pairs.entries()) {
        assert.notEqual(giver, receiver, 'Um participante nunca pode tirar a si mesmo');
      }

      // Verifica se forma um ciclo único que visita todos os participantes
      const visited = new Set<string>();
      let current = participants[0];
      for (let step = 0; step < participants.length; step++) {
        visited.add(current);
        const next = pairs.get(current);
        assert.ok(next, 'Todo participante deve ter um alvo sorteado');
        current = next;
      }
      assert.equal(current, participants[0], 'O ciclo deve fechar no participante inicial');
      assert.equal(visited.size, participants.length, 'Todos devem fazer parte do mesmo ciclo');
    }
  });

  it('bloqueia sorteio com menos de 3 participantes', () => {
    assert.throws(() => generateClosedCycleDraw(['p1', 'p2']), /pelo menos 3 participantes/);
  });
});

describe('Fluxo Completo de Grupo, Participantes, Lista de Desejos, PIN e Revelação', () => {
  it('cria grupo, cadastra participantes, edita lista de desejos, sorteia e revela com proteção de PIN', async () => {
    const group = await createGroup({
      title: 'Amigo Secreto da Família Silva',
      suggested_price: 'Entre R$ 50 e R$ 80',
    });

    assert.ok(group.invite_code);
    assert.ok(group.admin_token);
    assert.equal(group.is_drawn, false);

    const p1 = await joinGroup(group.invite_code, {
      name: 'Vovó Maria',
      pin: '1234',
      wishlist: ['Caixa de bombom', 'Sabonete Natura'],
    });

    const p2 = await joinGroup(group.invite_code, {
      name: 'Tio Carlos',
      pin: null,
      wishlist: ['Camisa polo G'],
    });

    const p3 = await joinGroup(group.invite_code, {
      name: 'Ana Paula',
      pin: '9999',
      wishlist: ['Livro de romance'],
    });

    assert.equal(p1.has_pin, true);
    assert.equal(p2.has_pin, false);
    assert.equal(p1.wishlist.length, 2);

    // Atualiza lista de desejos com validação de PIN
    await assert.rejects(
      () =>
        updateParticipantWishlist(p1.id, {
          wishlist: ['Perfume suave'],
          pin: '0000',
        }),
      /PIN/
    );

    const updatedP1 = await updateParticipantWishlist(p1.id, {
      wishlist: ['Caixa de bombom', 'hidratante para mãos', 'Porta-retrato'],
      pin: '1234',
    });
    assert.equal(updatedP1.wishlist.length, 3);

    // Executa o sorteio com o admin_token do organizador
    const drawnGroup = await performGroupDraw(group.invite_code, {
      admin_token: group.admin_token!,
    });
    assert.equal(drawnGroup.is_drawn, true);

    // Impede novo sorteio acidental sem force_redraw
    await assert.rejects(
      () =>
        performGroupDraw(group.invite_code, {
          admin_token: group.admin_token!,
        }),
      /já foi realizado/
    );

    // Revelação protegida por PIN para Vovó Maria
    await assert.rejects(() => revealParticipantTarget(p1.id, ''), /Digite seu PIN/);
    await assert.rejects(() => revealParticipantTarget(p1.id, '1111'), /PIN incorreto/);

    const revealP1 = await revealParticipantTarget(p1.id, '1234');
    assert.equal(revealP1.participant_name, 'Vovó Maria');
    assert.notEqual(revealP1.target_name, 'Vovó Maria');
    assert.equal(revealP1.suggested_price, 'Entre R$ 50 e R$ 80');

    // Revelação sem PIN para Tio Carlos
    const revealP2 = await revealParticipantTarget(p2.id);
    assert.equal(revealP2.participant_name, 'Tio Carlos');
    assert.notEqual(revealP2.target_name, 'Tio Carlos');

    // Garante que a listagem pública do grupo nunca expõe quem tirou quem
    const publicView = await getGroupByCode(group.invite_code);
    assert.equal(publicView.is_admin, false);
    assert.equal(publicView.admin_token, undefined);
    for (const participant of publicView.participants) {
      assert.equal('target_participant_id' in participant, false);
    }
  });
});
