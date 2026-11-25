import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AmigoSecretoService } from '../../services/amigo-secreto.service';
import {
  GroupView,
  Participant,
  RevealResult,
  SavedParticipantMemory,
} from '../../models/amigo-secreto.model';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (loadingGroup()) {
      <div
        class="bg-white border-2 border-slate-800 rounded-3xl p-8 text-center shadow-sm space-y-3"
        aria-live="polite"
      >
        <p class="text-2xl font-extrabold text-slate-900">
          Carregando o grupo...
        </p>
        <p class="text-lg text-slate-700">
          Só um instante, estamos buscando as informações.
        </p>
      </div>
    } @else if (groupError()) {
      <div
        role="alert"
        class="bg-red-50 border-4 border-red-800 rounded-3xl p-6 text-red-950 space-y-4"
      >
        <h1 class="text-2xl font-extrabold">
          ⚠️ Não foi possível abrir este grupo
        </h1>
        <p class="text-lg font-medium">
          {{ groupError() }}
        </p>
        <a
          routerLink="/"
          class="w-full min-h-[56px] px-6 py-4 rounded-2xl bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center"
        >
          Voltar para a página inicial
        </a>
      </div>
    } @else {
      @if (group(); as g) {
        <div class="space-y-6 pb-10">
        <!-- BARRA DE TOPO FIXA/DESTAQUE: Nome do Grupo e Valor Sugerido Sempre Visível -->
        <section
          class="sticky top-2 z-20 bg-amber-100 border-4 border-amber-900 rounded-3xl p-4 shadow-md"
          aria-label="Informações do grupo e valor do presente"
        >
          <div class="flex flex-col gap-1.5">
            <div class="flex items-start justify-between gap-2">
              <h1 class="text-xl sm:text-2xl font-extrabold text-slate-950 leading-tight">
                {{ g.title }}
              </h1>
              <span
                class="shrink-0 px-3 py-1 rounded-xl text-sm font-extrabold uppercase tracking-wide border"
                [ngClass]="
                  g.is_drawn
                    ? 'bg-emerald-900 text-white border-emerald-950'
                    : 'bg-white text-slate-900 border-slate-800'
                "
              >
                {{ g.is_drawn ? 'Sorteio Realizado' : 'Aberto para Entrar' }}
              </span>
            </div>
            <div class="mt-1 pt-2 border-t-2 border-amber-800/30 flex items-center gap-2 text-amber-950">
              <span class="text-2xl" aria-hidden="true">💰</span>
              <p class="text-lg sm:text-xl font-extrabold">
                Valor do presente: <span class="underline">{{ g.suggested_price }}</span>
              </p>
            </div>
          </div>
        </section>

        <!-- MENSAGENS DE FEEDBACK (SUCESSO OU ERRO) -->
        @if (feedbackMessage()) {
          <div
            role="status"
            aria-live="polite"
            class="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-900 text-emerald-950 font-bold text-lg flex items-center justify-between gap-3"
          >
            <span>✅ {{ feedbackMessage() }}</span>
            <button
              type="button"
              (click)="feedbackMessage.set(null)"
              class="px-3 py-1.5 rounded-xl bg-emerald-900 text-white text-base font-bold"
            >
              Fechar
            </button>
          </div>
        }

        @if (actionError()) {
          <div
            role="alert"
            class="p-4 rounded-2xl bg-red-100 border-2 border-red-900 text-red-950 font-bold text-lg"
          >
            ⚠️ {{ actionError() }}
          </div>
        }

        <!-- CARD DE CONTINUAR COMO [NOME] (LocalStorage) -->
        @if (savedParticipantOnDevice(); as savedP) {
          @if (activeParticipant()?.id !== savedP.id) {
            <section class="bg-emerald-50 border-3 border-emerald-800 rounded-3xl p-5 shadow-sm space-y-3">
              <h2 class="text-xl font-extrabold text-emerald-950">
                👋 Olá de novo!
              </h2>
              <p class="text-lg text-emerald-900">
                Este celular já está salvo no nome de <strong>{{ savedP.name }}</strong>.
              </p>
              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  (click)="selectParticipant(savedP)"
                  class="w-full min-h-[58px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xl shadow flex items-center justify-center gap-2"
                >
                  <span>Continuar como {{ savedP.name }}</span>
                  <span aria-hidden="true">➔</span>
                </button>
                <button
                  type="button"
                  (click)="forgetSavedParticipant()"
                  class="w-full min-h-[50px] px-4 py-2.5 rounded-2xl bg-white border-2 border-slate-700 text-slate-900 font-bold text-base"
                >
                  Não sou {{ savedP.name }} (escolher outra pessoa)
                </button>
              </div>
            </section>
          }
        }

        <!-- =============================================================== -->
        <!-- MODO 1: PARTICIPANTE SELECIONADO (Ver Sorteio e Editar Desejos) -->
        <!-- =============================================================== -->
        @if (activeParticipant(); as currentP) {
          <section class="bg-white border-4 border-emerald-900 rounded-3xl p-6 shadow-md space-y-6">
            <div class="flex items-center justify-between gap-2 border-b-2 border-slate-200 pb-4">
              <div>
                <span class="text-sm font-bold uppercase tracking-wider text-emerald-900">
                  Você entrou como:
                </span>
                <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-950">
                  👤 {{ currentP.name }}
                </h2>
              </div>
              <button
                type="button"
                (click)="switchPerson()"
                class="min-h-[48px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-700 text-slate-900 font-bold text-base"
              >
                Trocar pessoa
              </button>
            </div>

            <!-- BLOCO DE REVELAÇÃO DO AMIGO SECRETO (SE JÁ SORTEADO) -->
            @if (g.is_drawn) {
              <div class="space-y-4">
                @if (revealedResult(); as result) {
                  <!-- RESULTADO REVELADO EM DESTAQUE GRANDE -->
                  <div
                    class="bg-emerald-950 text-white border-4 border-amber-400 rounded-3xl p-6 shadow-lg space-y-5"
                    aria-live="polite"
                  >
                    <div class="text-center space-y-2">
                      <span class="inline-block px-4 py-1 rounded-full bg-amber-300 text-emerald-950 font-extrabold text-base uppercase">
                        🤫 Segredo! Só você está vendo
                      </span>
                      <p class="text-xl text-emerald-100 font-semibold pt-2">
                        {{ result.participant_name }}, você tirou:
                      </p>
                      <div class="py-4 px-3 rounded-2xl bg-white text-slate-950 border-4 border-amber-300 shadow-inner">
                        <p class="text-3xl sm:text-4xl font-extrabold tracking-tight break-words">
                          🎁 {{ result.target_name }}
                        </p>
                      </div>
                    </div>

                    <!-- Valor sugerido em destaque -->
                    <div class="bg-emerald-900/90 border-2 border-emerald-600 rounded-2xl p-4 text-center">
                      <p class="text-base text-emerald-200 font-medium">
                        Valor sugerido do presente:
                      </p>
                      <p class="text-xl font-extrabold text-amber-300 mt-0.5">
                        💰 {{ result.suggested_price }}
                      </p>
                    </div>

                    <!-- Lista de desejos de quem a pessoa tirou -->
                    <div class="bg-white text-slate-950 rounded-2xl p-5 space-y-3">
                      <h3 class="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span>📝</span> O que {{ result.target_name }} gostaria de ganhar:
                      </h3>

                      @if (result.target_wishlist.length > 0) {
                        <ul class="space-y-2.5">
                          @for (item of result.target_wishlist; track item.id) {
                            <li
                              class="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-800 text-slate-950 text-xl font-bold flex items-start gap-2.5"
                            >
                              <span aria-hidden="true">🎁</span>
                              <span>{{ item.description }}</span>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p class="p-4 rounded-xl bg-amber-50 border-2 border-amber-700 text-amber-950 text-lg font-semibold">
                          😊 {{ result.target_name }} ainda não escreveu sugestões de presente. Você pode escolher algo especial com carinho!
                        </p>
                      }
                    </div>

                    <!-- Botão grande para Ocultar Resultado -->
                    <button
                      type="button"
                      (click)="hideRevealResult()"
                      class="w-full min-h-[60px] px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <span>🙈 Ocultar resultado na tela</span>
                    </button>
                  </div>
                } @else {
                  <!-- TELA ANTES DE REVELAR (PEDE PIN OU CONFIRMAÇÃO CLARA) -->
                  <div class="bg-amber-50 border-3 border-amber-900 rounded-3xl p-5 space-y-4">
                    <h3 class="text-2xl font-extrabold text-slate-950">
                      🎉 O sorteio já foi feito!
                    </h3>

                    @if (currentP.has_pin) {
                      <p class="text-lg text-slate-800">
                        Você cadastrou uma senha (PIN de 4 números). Digite abaixo para ver quem você tirou:
                      </p>
                      <div>
                        <label for="revealPinInput" class="block text-lg font-bold text-slate-900 mb-2">
                          Sua senha de 4 números:
                        </label>
                        <input
                          id="revealPinInput"
                          name="revealPinInput"
                          type="password"
                          inputmode="numeric"
                          pattern="[0-9]*"
                          maxlength="4"
                          [(ngModel)]="revealPin"
                          placeholder="0000"
                          class="w-full min-h-[60px] px-4 py-3 text-center text-3xl font-extrabold tracking-[0.5em] rounded-2xl border-3 border-slate-800 bg-white text-slate-950"
                        />
                      </div>
                      <button
                        type="button"
                        [disabled]="loadingReveal()"
                        (click)="onRevealTarget()"
                        class="w-full min-h-[62px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xl shadow-md transition flex items-center justify-center gap-2"
                      >
                        @if (loadingReveal()) {
                          <span>Abrindo seu resultado...</span>
                        } @else {
                          <span>👀 Ver quem eu tirei</span>
                        }
                      </button>
                    } @else {
                      <p class="text-xl font-bold text-slate-900">
                        Você é <span class="underline">{{ currentP.name }}</span>?
                      </p>
                      <p class="text-lg text-slate-800">
                        Certifique-se de que ninguém está olhando para a tela do seu celular e toque no botão abaixo:
                      </p>
                      <button
                        type="button"
                        [disabled]="loadingReveal()"
                        (click)="onRevealTarget()"
                        class="w-full min-h-[64px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xl shadow-md transition flex items-center justify-center gap-3 text-center"
                      >
                        @if (loadingReveal()) {
                          <span>Abrindo seu resultado...</span>
                        } @else {
                          <span>🎁 Sou {{ currentP.name }}, toque para ver quem você tirou</span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            } @else {
              <!-- AVISO QUANDO O SORTEIO AINDA NÃO FOI REALIZADO -->
              <div class="p-5 rounded-2xl bg-amber-50 border-2 border-amber-800 text-amber-950 space-y-2">
                <p class="text-xl font-extrabold flex items-center gap-2">
                  <span>⏳</span> Aguardando o sorteio
                </p>
                <p class="text-lg">
                  Seu nome já está confirmado no grupo! Assim que o organizador fizer o sorteio, basta abrir este mesmo link para ver quem você tirou.
                </p>
              </div>
            }

            <hr class="border-slate-300" />

            <!-- SUA LISTA DE DESEJOS (PODE EDITAR ANTES E DEPOIS DO SORTEIO) -->
            <div class="space-y-4">
              <div>
                <h3 class="text-2xl font-extrabold text-slate-900">
                  📝 Sua lista de presentes
                </h3>
                <p class="text-lg text-slate-700 mt-1">
                  Escreva opções do que você gostaria de ganhar para ajudar quem tirar você:
                </p>
              </div>

              <!-- Lista atual de itens -->
              @if (editWishlistItems().length > 0) {
                <ul class="space-y-2.5">
                  @for (item of editWishlistItems(); track $index) {
                    <li
                      class="p-3.5 rounded-2xl bg-slate-100 border-2 border-slate-700 flex items-center justify-between gap-3"
                    >
                      <span class="text-lg font-bold text-slate-900">
                        🎁 {{ item }}
                      </span>
                      <button
                        type="button"
                        (click)="removeEditWishlistItem($index)"
                        class="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 border border-red-800 text-red-950 font-bold text-base shrink-0"
                        [attr.aria-label]="'Remover ' + item"
                      >
                        Remover
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="p-4 rounded-2xl bg-slate-100 border border-slate-400 text-slate-800 text-lg">
                  Você ainda não adicionou nenhum item na sua lista.
                </p>
              }

              <!-- Adicionar novo item na lista de edição -->
              <div class="flex flex-col sm:flex-row gap-2.5">
                <label for="editNewWishInput" class="sr-only">
                  Digite uma sugestão de presente
                </label>
                <input
                  id="editNewWishInput"
                  name="editNewWishInput"
                  type="text"
                  maxlength="140"
                  [(ngModel)]="newEditWishText"
                  (keydown.enter)="$event.preventDefault(); addEditWishlistItem()"
                  placeholder="Ex.: Perfume, Livro, Camisa M..."
                  class="flex-1 min-h-[56px] px-4 py-3 text-lg rounded-2xl border-2 border-slate-700 bg-white text-slate-900"
                />
                <button
                  type="button"
                  (click)="addEditWishlistItem()"
                  class="min-h-[56px] px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-lg shrink-0"
                >
                  + Adicionar item
                </button>
              </div>

              @if (currentP.has_pin) {
                <div>
                  <label for="editPinConfirm" class="block text-base font-bold text-slate-800 mb-1">
                    Confirme sua senha de 4 números para salvar a lista:
                  </label>
                  <input
                    id="editPinConfirm"
                    name="editPinConfirm"
                    type="password"
                    inputmode="numeric"
                    maxlength="4"
                    [(ngModel)]="editWishlistPin"
                    placeholder="0000"
                    class="w-40 min-h-[52px] px-4 py-2 text-center text-2xl font-extrabold tracking-widest rounded-xl border-2 border-slate-800 bg-white"
                  />
                </div>
              }

              <button
                type="button"
                [disabled]="savingWishlist()"
                (click)="onSaveWishlist()"
                class="w-full min-h-[58px] px-6 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-lg shadow transition"
              >
                @if (savingWishlist()) {
                  <span>Salvando sua lista...</span>
                } @else {
                  <span>💾 Salvar minha lista de presentes</span>
                }
              </button>
            </div>
          </section>
        }

        <!-- =============================================================== -->
        <!-- MODO 2: FORMULÁRIO PARA ENTRAR NO GRUPO (SE AINDA NÃO SORTEADO) -->
        <!-- =============================================================== -->
        @if (!g.is_drawn && !activeParticipant()) {
          <section class="bg-white border-3 border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h2 class="text-2xl font-extrabold text-slate-950">
                ✋ Entrar neste Amigo Secreto
              </h2>
              <p class="text-lg text-slate-700 mt-1">
                Coloque seu nome e o que você gostaria de ganhar:
              </p>
            </div>

            <form (ngSubmit)="onJoinGroup()" class="space-y-5">
              <!-- Nome do participante -->
              <div>
                <label for="participantName" class="block text-lg font-bold text-slate-900 mb-2">
                  1. Qual é o seu nome?
                </label>
                <input
                  id="participantName"
                  name="participantName"
                  type="text"
                  required
                  maxlength="100"
                  [(ngModel)]="joinName"
                  placeholder="Ex.: Tia Helena ou João Pedro"
                  class="w-full min-h-[56px] px-4 py-3 text-lg rounded-2xl border-2 border-slate-700 bg-white text-slate-900 placeholder:text-slate-500"
                />
              </div>

              <!-- Lista de desejos inicial -->
              <div class="space-y-3">
                <label for="joinWishInput" class="block text-lg font-bold text-slate-900">
                  2. O que você gostaria de ganhar? (Sugestões de presente)
                </label>
                <p class="text-base text-slate-700">
                  Lembre-se do valor combinado: <strong>{{ g.suggested_price }}</strong>.
                </p>

                @if (joinWishlist().length > 0) {
                  <ul class="space-y-2">
                    @for (item of joinWishlist(); track $index) {
                      <li
                        class="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-800 flex items-center justify-between gap-2"
                      >
                        <span class="text-lg font-bold text-slate-950">
                          🎁 {{ item }}
                        </span>
                        <button
                          type="button"
                          (click)="removeJoinWishItem($index)"
                          class="min-h-[42px] px-3 py-1 rounded-xl bg-red-100 border border-red-800 text-red-950 font-bold text-base"
                        >
                          Remover
                        </button>
                      </li>
                    }
                  </ul>
                }

                <div class="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="joinWishInput"
                    name="joinWishInput"
                    type="text"
                    maxlength="140"
                    [(ngModel)]="joinCurrentWishText"
                    (keydown.enter)="$event.preventDefault(); addJoinWishItem()"
                    placeholder="Digite um presente (ex.: Caixa de bombom)"
                    class="flex-1 min-h-[56px] px-4 py-3 text-lg rounded-2xl border-2 border-slate-700 bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    (click)="addJoinWishItem()"
                    class="min-h-[56px] px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-lg shrink-0"
                  >
                    + Adicionar à lista
                  </button>
                </div>
              </div>

              <!-- PIN opcional de 4 dígitos -->
              <div class="p-4 rounded-2xl bg-slate-100 border-2 border-slate-300 space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <label for="usePinToggle" class="text-lg font-bold text-slate-900 cursor-pointer">
                    3. Proteger meu resultado com senha de 4 números (opcional)
                  </label>
                  <input
                    id="usePinToggle"
                    name="usePinToggle"
                    type="checkbox"
                    [(ngModel)]="usePinOnJoin"
                    class="w-7 h-7 accent-emerald-800 rounded cursor-pointer"
                  />
                </div>
                <p class="text-base text-slate-700">
                  Se quiser que só você consiga abrir seu resultado com uma senha simples de 4 números, marque a caixinha acima.
                </p>

                @if (usePinOnJoin) {
                  <div class="pt-2">
                    <label for="joinPinInput" class="block text-base font-bold text-slate-900 mb-1">
                      Crie uma senha fácil de 4 números (ex.: 1234):
                    </label>
                    <input
                      id="joinPinInput"
                      name="joinPinInput"
                      type="tel"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      maxlength="4"
                      [(ngModel)]="joinPin"
                      placeholder="1234"
                      class="w-44 min-h-[56px] px-4 py-2 text-center text-2xl font-extrabold tracking-widest rounded-xl border-2 border-slate-800 bg-white text-slate-950"
                    />
                  </div>
                }
              </div>

              <button
                type="submit"
                [disabled]="joiningGroup()"
                class="w-full min-h-[62px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xl shadow-md transition flex items-center justify-center gap-2"
              >
                @if (joiningGroup()) {
                  <span>Confirmando sua participação...</span>
                } @else {
                  <span>✅ Confirmar meu nome no grupo</span>
                }
              </button>
            </form>
          </section>
        }

        <!-- =============================================================== -->
        <!-- LISTA DE PARTICIPANTES DO GRUPO (Para Selecionar o Próprio Nome)-->
        <!-- =============================================================== -->
        <section class="bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-2xl font-extrabold text-slate-950">
              👥 Participantes ({{ g.participants.length }})
            </h2>
          </div>

          @if (g.participants.length === 0) {
            <p class="p-4 rounded-2xl bg-slate-100 text-slate-800 text-lg font-medium">
              Ainda não há participantes cadastrados. Seja a primeira pessoa a colocar o nome acima!
            </p>
          } @else {
            <p class="text-lg text-slate-700">
              @if (g.is_drawn) {
                <strong>Toque no seu próprio nome abaixo</strong> para ver quem você tirou ou editar seus pedidos de presente:
              } @else {
                Pessoas já confirmadas no grupo (toque no seu nome se quiser alterar sua lista de presentes):
              }
            </p>

            <div class="space-y-3">
              @for (p of g.participants; track p.id) {
                <button
                  type="button"
                  (click)="selectParticipant(p)"
                  class="w-full min-h-[60px] p-4 rounded-2xl border-2 text-left transition flex items-center justify-between gap-3"
                  [ngClass]="
                    activeParticipant()?.id === p.id
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-950 border-slate-700'
                  "
                >
                  <div>
                    <span class="text-xl font-extrabold block">
                      {{ p.name }}
                      @if (activeParticipant()?.id === p.id) {
                        <span class="text-sm font-bold bg-amber-300 text-slate-950 px-2.5 py-0.5 rounded-full ml-1">
                          Você
                        </span>
                      }
                    </span>
                    <span
                      class="text-base block mt-0.5"
                      [ngClass]="
                        activeParticipant()?.id === p.id ? 'text-emerald-100' : 'text-slate-700'
                      "
                    >
                      @if (p.wishlist.length > 0) {
                        🎁 {{ p.wishlist.length }} {{ p.wishlist.length === 1 ? 'sugestão de presente' : 'sugestões de presente' }}
                      } @else {
                        Sem sugestões cadastradas ainda
                      }
                      @if (p.has_pin) {
                        • 🔒 Com senha
                      }
                    </span>
                  </div>
                  <span class="text-xl font-extrabold shrink-0">
                    {{ g.is_drawn ? 'Ver sorteio ➔' : 'Abrir ➔' }}
                  </span>
                </button>
              }
            </div>
          }
        </section>

        <!-- =============================================================== -->
        <!-- COMPARTILHAR NO WHATSAPP (Visível para facilitar convites)      -->
        <!-- =============================================================== -->
        <section class="bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900">
            📲 Convidar ou enviar link no WhatsApp
          </h2>
          <p class="text-lg text-slate-700">
            Envie o link deste grupo no WhatsApp da família para todos entrarem ou consultarem quem tiraram:
          </p>
          <a
            [href]="getWhatsAppUrl(g)"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full min-h-[58px] px-6 py-4 rounded-2xl bg-[#128C7E] hover:bg-[#075E54] text-white font-extrabold text-xl flex items-center justify-center gap-3 shadow transition text-center"
          >
            <span aria-hidden="true">💬</span>
            <span>Compartilhar no WhatsApp</span>
          </a>
          <button
            type="button"
            (click)="copyGroupLink(g)"
            class="w-full min-h-[54px] px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-700 text-slate-900 font-bold text-lg"
          >
            {{ linkCopied() ? '✅ Link copiado!' : '📋 Copiar link do grupo (Código: ' + g.invite_code + ')' }}
          </button>
        </section>

        <!-- =============================================================== -->
        <!-- PAINEL DO ORGANIZADOR (SORTEIO)                                 -->
        <!-- =============================================================== -->
        @if (g.is_admin) {
          <section
            class="bg-amber-50 border-4 border-amber-900 rounded-3xl p-6 shadow-md space-y-5"
            aria-label="Painel do Organizador"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl" aria-hidden="true">👑</span>
              <div>
                <span class="text-sm font-extrabold uppercase tracking-wider text-amber-900">
                  Acesso Exclusivo
                </span>
                <h2 class="text-2xl font-extrabold text-slate-950">
                  Painel do Organizador
                </h2>
              </div>
            </div>

            <p class="text-lg text-slate-800">
              Participantes confirmados até agora: <strong>{{ g.participants.length }}</strong> (mínimo de 3 pessoas para sortear).
            </p>

            @if (!g.is_drawn) {
              @if (g.participants.length < 3) {
                <div class="p-4 rounded-2xl bg-white border-2 border-amber-800 text-amber-950 font-semibold text-lg">
                  ⏳ Faltam <strong>{{ 3 - g.participants.length }}</strong> participante(s) entrar(em) no grupo para liberar o botão de sorteio.
                </div>
              } @else {
                @if (!confirmingDraw()) {
                  <button
                    type="button"
                    (click)="confirmingDraw.set(true)"
                    class="w-full min-h-[64px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-2xl shadow-lg transition flex items-center justify-center gap-3"
                  >
                    <span>🎲 Realizar sorteio agora</span>
                  </button>
                } @else {
                  <!-- Confirmação explícita para evitar clique acidental -->
                  <div class="p-5 rounded-2xl bg-white border-3 border-emerald-900 space-y-4">
                    <h3 class="text-xl font-extrabold text-slate-950">
                      Tem certeza que todos já colocaram o nome?
                    </h3>
                    <p class="text-lg text-slate-700">
                      Ao confirmar, o sorteio será feito em ciclo fechado (ninguém tira a si mesmo) e cada participante poderá ver quem tirou no próprio celular.
                    </p>
                    <div class="flex flex-col gap-3">
                      <button
                        type="button"
                        [disabled]="drawing()"
                        (click)="onPerformDraw(false)"
                        class="w-full min-h-[60px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xl shadow"
                      >
                        @if (drawing()) {
                          <span>Sorteando, aguarde...</span>
                        } @else {
                          <span>✅ Sim, realizar o sorteio!</span>
                        }
                      </button>
                      <button
                        type="button"
                        [disabled]="drawing()"
                        (click)="confirmingDraw.set(false)"
                        class="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-lg"
                      >
                        Cancelar (ainda falta gente)
                      </button>
                    </div>
                  </div>
                }
              }
            } @else {
              <!-- Sorteio já realizado: bloqueado contra clique acidental -->
              <div class="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-900 text-emerald-950 space-y-2">
                <p class="text-xl font-extrabold">
                  ✅ O sorteio já foi realizado!
                </p>
                <p class="text-lg">
                  Agora cada pessoa só precisa abrir o link do grupo no celular e tocar no próprio nome para ver quem tirou.
                </p>
              </div>

              @if (!confirmingRedraw()) {
                <button
                  type="button"
                  (click)="confirmingRedraw.set(true)"
                  class="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-white hover:bg-red-50 border-2 border-red-800 text-red-900 font-bold text-base"
                >
                  Precisa refazer o sorteio do zero? Toque aqui
                </button>
              } @else {
                <div class="p-5 rounded-2xl bg-red-50 border-3 border-red-900 text-red-950 space-y-4">
                  <h3 class="text-xl font-extrabold">
                    ⚠️ Atenção: Deseja realmente refazer o sorteio?
                  </h3>
                  <p class="text-lg">
                    Isso vai apagar o sorteio anterior e sortear novos pares para todos os participantes.
                  </p>
                  <div class="flex flex-col gap-3">
                    <button
                      type="button"
                      [disabled]="drawing()"
                      (click)="onPerformDraw(true)"
                      class="w-full min-h-[56px] px-5 py-3.5 rounded-2xl bg-red-800 hover:bg-red-900 text-white font-extrabold text-lg"
                    >
                      @if (drawing()) {
                        <span>Refazendo sorteio...</span>
                      } @else {
                        <span>Sim, quero sortear tudo novamente</span>
                      }
                    </button>
                    <button
                      type="button"
                      (click)="confirmingRedraw.set(false)"
                      class="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-white border-2 border-slate-700 text-slate-900 font-bold text-lg"
                    >
                      Não, manter o sorteio atual
                    </button>
                  </div>
                </div>
              }
            }
          </section>
        }
        </div>
      }
    }
  `,
})
export class GroupComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(AmigoSecretoService);

  readonly loadingGroup = signal(true);
  readonly groupError = signal<string | null>(null);
  readonly group = signal<GroupView | null>(null);

  readonly activeParticipant = signal<Participant | null>(null);
  readonly savedMemory = signal<SavedParticipantMemory | null>(null);

  // Formulário de entrada
  joinName = '';
  joinCurrentWishText = '';
  readonly joinWishlist = signal<string[]>([]);
  usePinOnJoin = false;
  joinPin = '';
  readonly joiningGroup = signal(false);

  // Edição da lista de desejos
  newEditWishText = '';
  readonly editWishlistItems = signal<string[]>([]);
  editWishlistPin = '';
  readonly savingWishlist = signal(false);

  // Revelação secreta
  revealPin = '';
  readonly loadingReveal = signal(false);
  readonly revealedResult = signal<RevealResult | null>(null);

  // Sorteio (Organizador)
  readonly confirmingDraw = signal(false);
  readonly confirmingRedraw = signal(false);
  readonly drawing = signal(false);

  // Feedbacks
  readonly feedbackMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly linkCopied = signal(false);

  private currentCodeOrToken = '';
  private currentAdminToken: string | null = null;

  readonly savedParticipantOnDevice = computed(() => {
    const g = this.group();
    const mem = this.savedMemory();
    if (!g || !mem) return null;
    return g.participants.find((p) => p.id === mem.participantId) || null;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const code = params.get('code') || params.get('token') || '';
      const queryAdmin = this.route.snapshot.queryParamMap.get('admin');
      this.currentCodeOrToken = code;
      this.currentAdminToken =
        queryAdmin || this.service.getSavedAdminTokenForGroup(code);
      this.loadGroup();
    });
  }

  loadGroup(): void {
    this.loadingGroup.set(true);
    this.groupError.set(null);

    this.service
      .getGroup(this.currentCodeOrToken, this.currentAdminToken)
      .subscribe({
        next: (g) => {
          this.group.set(g);
          this.loadingGroup.set(false);

          if (g.is_admin && g.admin_token) {
            this.currentAdminToken = g.admin_token;
            this.service.saveAdminGroup(g);
          }

          const saved = this.service.getSavedParticipantForGroup(g.invite_code);
          this.savedMemory.set(saved);

          if (saved) {
            const matching = g.participants.find((p) => p.id === saved.participantId);
            if (matching) {
              this.setActiveParticipantState(matching);
            }
          }
        },
        error: (err: Error) => {
          this.loadingGroup.set(false);
          this.groupError.set(err.message);
        },
      });
  }

  addJoinWishItem(): void {
    const clean = this.joinCurrentWishText.trim();
    if (!clean) return;
    this.joinWishlist.update((list) => [...list, clean]);
    this.joinCurrentWishText = '';
  }

  removeJoinWishItem(index: number): void {
    this.joinWishlist.update((list) => list.filter((_, i) => i !== index));
  }

  onJoinGroup(): void {
    const g = this.group();
    if (!g) return;

    this.actionError.set(null);
    this.feedbackMessage.set(null);

    const cleanName = this.joinName.trim();
    if (cleanName.length < 2) {
      this.actionError.set('Por favor, digite seu nome (pelo menos 2 letras).');
      return;
    }

    // Se o usuário digitou algo no campo de sugestão mas esqueceu de apertar "+ Adicionar à lista", incluímos automaticamente
    if (this.joinCurrentWishText.trim()) {
      this.addJoinWishItem();
    }

    let pinToSave: string | null = null;
    if (this.usePinOnJoin) {
      const cleanPin = this.joinPin.trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        this.actionError.set('A senha (PIN) deve ter exatamente 4 números (ex.: 1234).');
        return;
      }
      pinToSave = cleanPin;
    }

    this.joiningGroup.set(true);
    this.service
      .joinGroup(g.invite_code, {
        name: cleanName,
        pin: pinToSave,
        wishlist: this.joinWishlist(),
      })
      .subscribe({
        next: (createdParticipant) => {
          this.joiningGroup.set(false);
          this.joinName = '';
          this.joinWishlist.set([]);
          this.joinPin = '';
          this.usePinOnJoin = false;

          // Atualiza grupo local e salva no localStorage
          this.group.update((curr) =>
            curr
              ? { ...curr, participants: [...curr.participants, createdParticipant] }
              : curr
          );

          this.rememberParticipant(createdParticipant, g);
          this.setActiveParticipantState(createdParticipant);
          this.feedbackMessage.set(
            `Parabéns, ${createdParticipant.name}! Seu nome e sua lista foram salvos no grupo.`
          );
        },
        error: (err: Error) => {
          this.joiningGroup.set(false);
          this.actionError.set(err.message);
        },
      });
  }

  selectParticipant(participant: Participant): void {
    const g = this.group();
    if (!g) return;
    this.actionError.set(null);
    this.feedbackMessage.set(null);
    this.revealedResult.set(null);
    this.revealPin = '';
    this.rememberParticipant(participant, g);
    this.setActiveParticipantState(participant);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private setActiveParticipantState(participant: Participant): void {
    this.activeParticipant.set(participant);
    this.editWishlistItems.set(participant.wishlist.map((w) => w.description));
    this.newEditWishText = '';
    this.editWishlistPin = '';
  }

  private rememberParticipant(participant: Participant, g: GroupView): void {
    const mem: SavedParticipantMemory = {
      participantId: participant.id,
      participantName: participant.name,
      inviteCode: g.invite_code,
      groupTitle: g.title,
      updatedAt: new Date().toISOString(),
    };
    this.service.saveParticipantForGroup(mem);
    this.savedMemory.set(mem);
  }

  switchPerson(): void {
    this.activeParticipant.set(null);
    this.revealedResult.set(null);
    this.revealPin = '';
    this.actionError.set(null);
    this.feedbackMessage.set(null);
  }

  forgetSavedParticipant(): void {
    const g = this.group();
    if (!g) return;
    this.service.clearSavedParticipantForGroup(g.invite_code);
    this.savedMemory.set(null);
    this.switchPerson();
  }

  addEditWishlistItem(): void {
    const clean = this.newEditWishText.trim();
    if (!clean) return;
    this.editWishlistItems.update((list) => [...list, clean]);
    this.newEditWishText = '';
  }

  removeEditWishlistItem(index: number): void {
    this.editWishlistItems.update((list) => list.filter((_, i) => i !== index));
  }

  onSaveWishlist(): void {
    const currentP = this.activeParticipant();
    if (!currentP) return;

    this.actionError.set(null);
    this.feedbackMessage.set(null);

    if (this.newEditWishText.trim()) {
      this.addEditWishlistItem();
    }

    this.savingWishlist.set(true);
    this.service
      .updateWishlist(currentP.id, {
        wishlist: this.editWishlistItems(),
        pin: currentP.has_pin ? this.editWishlistPin.trim() : null,
      })
      .subscribe({
        next: (updatedP) => {
          this.savingWishlist.set(false);
          this.activeParticipant.set(updatedP);
          this.group.update((curr) =>
            curr
              ? {
                  ...curr,
                  participants: curr.participants.map((p) =>
                    p.id === updatedP.id ? updatedP : p
                  ),
                }
              : curr
          );
          this.feedbackMessage.set('Sua lista de presentes foi atualizada com sucesso!');
        },
        error: (err: Error) => {
          this.savingWishlist.set(false);
          this.actionError.set(err.message);
        },
      });
  }

  onRevealTarget(): void {
    const currentP = this.activeParticipant();
    if (!currentP) return;

    this.actionError.set(null);
    this.loadingReveal.set(true);

    this.service
      .revealTarget(currentP.id, currentP.has_pin ? this.revealPin.trim() : null)
      .subscribe({
        next: (result) => {
          this.loadingReveal.set(false);
          this.revealedResult.set(result);
        },
        error: (err: Error) => {
          this.loadingReveal.set(false);
          this.actionError.set(err.message);
        },
      });
  }

  hideRevealResult(): void {
    this.revealedResult.set(null);
    this.revealPin = '';
  }

  onPerformDraw(forceRedraw: boolean): void {
    const g = this.group();
    if (!g || !this.currentAdminToken) return;

    this.actionError.set(null);
    this.feedbackMessage.set(null);
    this.drawing.set(true);

    this.service
      .performDraw(g.invite_code, {
        admin_token: this.currentAdminToken,
        force_redraw: forceRedraw,
      })
      .subscribe({
        next: (updatedGroup) => {
          this.drawing.set(false);
          this.confirmingDraw.set(false);
          this.confirmingRedraw.set(false);
          this.revealedResult.set(null);
          this.group.set(updatedGroup);
          this.feedbackMessage.set(
            '🎉 Sorteio realizado com sucesso! Agora cada participante pode tocar no próprio nome para ver quem tirou.'
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err: Error) => {
          this.drawing.set(false);
          this.actionError.set(err.message);
        },
      });
  }

  getWhatsAppUrl(g: GroupView): string {
    return this.service.buildWhatsAppShareUrl(g);
  }

  async copyGroupLink(g: GroupView): Promise<void> {
    const url = this.service.buildInviteUrl(g.invite_code);
    try {
      await navigator.clipboard.writeText(url);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 3000);
    } catch {
      // Fallback
    }
  }
}
