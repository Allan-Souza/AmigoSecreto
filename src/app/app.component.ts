import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col bg-[#FDFBF7] text-slate-900">
      <!-- Cabeçalho simples e de alto contraste -->
      <header class="bg-emerald-900 text-white border-b-4 border-emerald-950 shadow-sm">
        <div class="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <a
            routerLink="/"
            class="flex items-center gap-3 text-white hover:opacity-95 focus:outline-none rounded-xl py-1"
            aria-label="Voltar para a página inicial do Amigo Secreto Simples"
          >
            <span
              class="w-11 h-11 rounded-2xl bg-amber-300 text-emerald-950 flex items-center justify-center text-2xl font-extrabold shadow"
              aria-hidden="true"
            >
              🎁
            </span>
            <div>
              <span class="block text-xl font-extrabold tracking-tight leading-tight">
                Amigo Secreto Simples
              </span>
              <span class="block text-sm text-emerald-100 font-medium">
                Fácil para toda a família
              </span>
            </div>
          </a>
        </div>
      </header>

      <!-- Conteúdo principal em coluna única mobile-first -->
      <main class="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <router-outlet></router-outlet>
      </main>

      <!-- Rodapé limpo -->
      <footer class="border-t-2 border-slate-200 bg-white py-5 px-4 text-center text-base text-slate-700">
        <div class="max-w-lg mx-auto">
          <p class="font-semibold text-slate-800">Amigo Secreto Simples</p>
          <p class="text-sm text-slate-600 mt-1">
            Feito com letras grandes e botões fáceis de tocar no celular.
          </p>
        </div>
      </footer>
    </div>
  `,
})
export class AppComponent {}
