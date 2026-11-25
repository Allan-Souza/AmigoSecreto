import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AmigoSecretoService } from '../../services/amigo-secreto.service';
import {
  GroupView,
  SavedAdminGroupMemory,
  SavedParticipantMemory,
} from '../../models/amigo-secreto.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Cartão de boas-vindas -->
      <section class="bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-sm">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
          Organize o Amigo Secreto da sua família sem complicação
        </h1>
        <p class="mt-3 text-lg text-slate-700 leading-relaxed">
          Cada pessoa abre o link no próprio celular, escreve o que gostaria de ganhar e vê quem tirou em segredo.
        </p>
      </section>

      <!-- Atalho rápido se a pessoa já participou de algum grupo neste celular -->
      @if (recentParticipants().length > 0) {
        <section
          class="bg-emerald-50 border-2 border-emerald-800 rounded-3xl p-5 shadow-sm"
          aria-label="Seus grupos salvos neste celular"
        >
          <h2 class="text-xl font-extrabold text-emerald-950 flex items-center gap-2">
            <span>📱</span> Continuar no seu grupo
          </h2>
          <p class="text-base text-emerald-900 mt-1">
            Toque abaixo para voltar direto para o seu grupo:
          </p>
          <div class="mt-4 space-y-3">
            @for (item of recentParticipants(); track item.inviteCode) {
              <a
                [routerLink]="['/g', item.inviteCode]"
                class="w-full min-h-[58px] px-5 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-lg flex items-center justify-between shadow transition"
              >
                <span>
                  Continuar como <strong class="underline">{{ item.participantName }}</strong>
                  <span class="block text-sm font-normal text-emerald-100 mt-0.5">
                    Grupo: {{ item.groupTitle }}
                  </span>
                </span>
                <span class="text-2xl ml-3" aria-hidden="true">➔</span>
              </a>
            }
          </div>
        </section>
      }

      <!-- Se o grupo acabou de ser criado pelo organizador: tela de convite pronta -->
      @if (createdGroup(); as group) {
        <section
          class="bg-white border-4 border-emerald-800 rounded-3xl p-6 shadow-md space-y-6"
          aria-live="polite"
        >
          <div class="bg-emerald-100 border-2 border-emerald-800 rounded-2xl p-4 text-emerald-950">
            <p class="text-sm font-bold uppercase tracking-wider text-emerald-900">
              Tudo pronto!
            </p>
            <h2 class="text-2xl font-extrabold mt-1">
              Grupo "{{ group.title }}" criado com sucesso!
            </h2>
            <p class="text-lg font-semibold mt-1">
              💰 Valor do presente: {{ group.suggested_price }}
            </p>
          </div>

          <!-- Passo 1: Enviar no WhatsApp -->
          <div class="space-y-3">
            <h3 class="text-xl font-extrabold text-slate-900">
              1º Passo: Convide os participantes
            </h3>
            <p class="text-lg text-slate-700">
              Envie o convite no grupo da família ou para cada pessoa no WhatsApp:
            </p>

            <a
              [href]="getWhatsAppUrl(group)"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full min-h-[60px] px-6 py-4 rounded-2xl bg-[#128C7E] hover:bg-[#075E54] text-white font-extrabold text-xl flex items-center justify-center gap-3 shadow-md transition text-center"
            >
              <span class="text-2xl" aria-hidden="true">💬</span>
              <span>Enviar convite no WhatsApp</span>
            </a>

            <button
              type="button"
              (click)="copyInviteLink(group)"
              class="w-full min-h-[56px] px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-800 text-slate-900 font-bold text-lg flex items-center justify-center gap-2 transition"
            >
              <span>📋</span>
              <span>
                {{ copiedInvite() ? 'Link dos participantes copiado!' : 'Copiar link dos participantes' }}
              </span>
            </button>

            <div class="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-base text-slate-800 break-all">
              <span class="font-bold block text-sm text-slate-600 uppercase">
                Código do grupo: {{ group.invite_code }}
              </span>
              {{ getInviteUrl(group) }}
            </div>
          </div>

          <hr class="border-slate-300" />

          <!-- Passo 2: Link do Organizador -->
          <div class="space-y-3">
            <h3 class="text-xl font-extrabold text-slate-900">
              2º Passo: Painel do Organizador (Sorteio)
            </h3>
            <p class="text-lg text-slate-700">
              Guarde seu acesso de organizador. É por ele que você fará o sorteio quando todos tiverem colocado o nome:
            </p>

            <button
              type="button"
              (click)="copyAdminLink(group)"
              class="w-full min-h-[56px] px-5 py-3.5 rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-900 text-amber-950 font-bold text-lg flex items-center justify-center gap-2 transition"
            >
              <span>🔑</span>
              <span>
                {{ copiedAdmin() ? 'Link do organizador copiado!' : 'Copiar meu link de organizador' }}
              </span>
            </button>

            <button
              type="button"
              (click)="goToAdminPanel(group)"
              class="w-full min-h-[60px] px-6 py-4 rounded-2xl bg-emerald-900 hover:bg-emerald-950 text-white font-extrabold text-xl flex items-center justify-center gap-3 shadow-md transition"
            >
              <span>Ir para o grupo e cadastrar meu nome</span>
              <span aria-hidden="true">➔</span>
            </button>
          </div>
        </section>
      } @else {
        <!-- Formulário Principal: Criar um Novo Grupo -->
        <section class="bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <span
              class="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-extrabold text-xl"
              aria-hidden="true"
            >
              1
            </span>
            <h2 class="text-2xl font-extrabold text-slate-900">
              Criar um novo grupo
            </h2>
          </div>

          @if (errorMessage()) {
            <div
              role="alert"
              class="mb-5 p-4 rounded-2xl bg-red-50 border-2 border-red-800 text-red-950 font-semibold text-lg"
            >
              ⚠️ {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onCreateGroup()" class="space-y-5">
            <div>
              <label
                for="groupTitle"
                class="block text-lg font-bold text-slate-900 mb-2"
              >
                Qual é o nome do grupo?
              </label>
              <input
                id="groupTitle"
                name="groupTitle"
                type="text"
                required
                maxlength="120"
                [(ngModel)]="title"
                placeholder="Ex.: Amigo Secreto da Família"
                class="w-full min-h-[56px] px-4 py-3 text-lg rounded-2xl border-2 border-slate-700 bg-white text-slate-900 placeholder:text-slate-500 focus:border-emerald-800"
              />
            </div>

            <div>
              <label
                for="suggestedPrice"
                class="block text-lg font-bold text-slate-900 mb-2"
              >
                Qual é o valor sugerido do presente?
              </label>
              <input
                id="suggestedPrice"
                name="suggestedPrice"
                type="text"
                required
                maxlength="100"
                [(ngModel)]="suggestedPrice"
                placeholder="Ex.: Até R$ 50,00 ou Entre R$ 40 e R$ 60"
                class="w-full min-h-[56px] px-4 py-3 text-lg rounded-2xl border-2 border-slate-700 bg-white text-slate-900 placeholder:text-slate-500 focus:border-emerald-800"
              />
              <!-- Sugestões rápidas de valor com toque fácil -->
              <div class="mt-2.5 flex flex-wrap gap-2">
                @for (preset of pricePresets; track preset) {
                  <button
                    type="button"
                    (click)="suggestedPrice = preset"
                    class="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-500 text-slate-900 text-base font-semibold transition"
                  >
                    {{ preset }}
                  </button>
                }
              </div>
            </div>

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full min-h-[60px] px-6 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-extrabold text-xl shadow-md transition flex items-center justify-center gap-3"
            >
              @if (loading()) {
                <span>Criando grupo, aguarde...</span>
              } @else {
                <span>✨ Criar grupo de Amigo Secreto</span>
              }
            </button>
          </form>
        </section>

        <!-- Entrar com código de convite existente -->
        <section class="bg-white border-2 border-slate-800 rounded-3xl p-6 shadow-sm">
          <div class="flex items-center gap-3 mb-3">
            <span
              class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-extrabold text-xl"
              aria-hidden="true"
            >
              2
            </span>
            <h2 class="text-2xl font-extrabold text-slate-900">
              Já recebeu um código?
            </h2>
          </div>
          <p class="text-lg text-slate-700 mb-4">
            Se alguém te passou o código do grupo, digite abaixo para entrar:
          </p>

          <form (ngSubmit)="onEnterByCode()" class="space-y-4">
            <div>
              <label for="inviteCodeInput" class="sr-only">
                Código do grupo
              </label>
              <input
                id="inviteCodeInput"
                name="inviteCodeInput"
                type="text"
                [(ngModel)]="enterCode"
                placeholder="Digite o código (ex.: ABC123)"
                class="w-full min-h-[56px] px-4 py-3 text-xl font-bold uppercase tracking-wider rounded-2xl border-2 border-slate-700 bg-white text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              class="w-full min-h-[56px] px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-lg transition"
            >
              Entrar no grupo ➔
            </button>
          </form>
        </section>
      }

      <!-- Grupos criados por este celular (Organizador) -->
      @if (savedAdminGroups().length > 0) {
        <section
          class="bg-amber-50 border-2 border-amber-900 rounded-3xl p-6 shadow-sm"
          aria-label="Grupos que você organiza"
        >
          <h2 class="text-xl font-extrabold text-amber-950 flex items-center gap-2">
            <span>👑</span> Grupos que você criou neste celular
          </h2>
          <p class="text-base text-amber-900 mt-1">
            Toque para abrir o painel de organizador e realizar o sorteio:
          </p>
          <div class="mt-4 space-y-3">
            @for (adm of savedAdminGroups(); track adm.inviteCode) {
              <a
                [routerLink]="['/g', adm.inviteCode]"
                [queryParams]="{ admin: adm.adminToken }"
                class="w-full min-h-[56px] px-5 py-3.5 rounded-2xl bg-white hover:bg-amber-100 border-2 border-amber-900 text-amber-950 font-bold text-lg flex items-center justify-between transition"
              >
                <span>
                  {{ adm.title }}
                  <span class="block text-sm font-normal text-amber-900">
                    Código: {{ adm.inviteCode }} • {{ adm.suggestedPrice }}
                  </span>
                </span>
                <span class="text-xl font-extrabold">Abrir ➔</span>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private readonly service = inject(AmigoSecretoService);
  private readonly router = inject(Router);

  title = '';
  suggestedPrice = '';
  enterCode = '';

  readonly pricePresets = [
    'Até R$ 50,00',
    'Entre R$ 50 e R$ 80',
    'Até R$ 100,00',
    'Valor livre',
  ];

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly createdGroup = signal<GroupView | null>(null);
  readonly copiedInvite = signal(false);
  readonly copiedAdmin = signal(false);

  readonly recentParticipants = signal<SavedParticipantMemory[]>([]);
  readonly savedAdminGroups = signal<SavedAdminGroupMemory[]>([]);

  ngOnInit(): void {
    this.recentParticipants.set(this.service.getRecentParticipants());
    this.savedAdminGroups.set(this.service.getSavedAdminGroups());
  }

  onCreateGroup(): void {
    this.errorMessage.set(null);
    const cleanTitle = this.title.trim();
    const cleanPrice = this.suggestedPrice.trim();

    if (cleanTitle.length < 3) {
      this.errorMessage.set('Por favor, digite um nome para o grupo (ex.: Amigo Secreto da Família).');
      return;
    }
    if (cleanPrice.length < 2) {
      this.errorMessage.set('Por favor, informe o valor sugerido do presente (ex.: Até R$ 50,00).');
      return;
    }

    this.loading.set(true);
    this.service
      .createGroup({ title: cleanTitle, suggested_price: cleanPrice })
      .subscribe({
        next: (group) => {
          this.loading.set(false);
          this.service.saveAdminGroup(group);
          this.savedAdminGroups.set(this.service.getSavedAdminGroups());
          this.createdGroup.set(group);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  onEnterByCode(): void {
    const clean = this.enterCode.trim().toUpperCase();
    if (!clean) {
      this.errorMessage.set('Digite o código do grupo para entrar.');
      return;
    }
    this.router.navigate(['/g', clean]);
  }

  getInviteUrl(group: GroupView): string {
    return this.service.buildInviteUrl(group.invite_code);
  }

  getWhatsAppUrl(group: GroupView): string {
    return this.service.buildWhatsAppShareUrl(group);
  }

  async copyInviteLink(group: GroupView): Promise<void> {
    const url = this.service.buildInviteUrl(group.invite_code);
    try {
      await navigator.clipboard.writeText(url);
      this.copiedInvite.set(true);
      setTimeout(() => this.copiedInvite.set(false), 3000);
    } catch {
      // Fallback
    }
  }

  async copyAdminLink(group: GroupView): Promise<void> {
    if (!group.admin_token) return;
    const url = this.service.buildAdminUrl(group.invite_code, group.admin_token);
    try {
      await navigator.clipboard.writeText(url);
      this.copiedAdmin.set(true);
      setTimeout(() => this.copiedAdmin.set(false), 3000);
    } catch {
      // Fallback
    }
  }

  goToAdminPanel(group: GroupView): void {
    this.router.navigate(['/g', group.invite_code], {
      queryParams: group.admin_token ? { admin: group.admin_token } : {},
    });
  }
}
