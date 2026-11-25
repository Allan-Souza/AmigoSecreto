import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { GroupComponent } from './pages/group/group.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Amigo Secreto Simples — Criar ou Entrar',
  },
  {
    path: 'g/:code',
    component: GroupComponent,
    title: 'Grupo — Amigo Secreto Simples',
  },
  {
    path: 'admin/:token',
    component: GroupComponent,
    title: 'Painel do Organizador — Amigo Secreto Simples',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
