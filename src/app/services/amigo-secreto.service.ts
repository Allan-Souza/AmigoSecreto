import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  GroupView,
  Participant,
  RevealResult,
  SavedAdminGroupMemory,
  SavedParticipantMemory,
} from '../models/amigo-secreto.model';

const PARTICIPANT_STORAGE_PREFIX = 'amigo_secreto_participante_';
const RECENT_GROUPS_KEY = 'amigo_secreto_grupos_recentes';
const ADMIN_GROUPS_KEY = 'amigo_secreto_meus_grupos_admin';

@Injectable({
  providedIn: 'root',
})
export class AmigoSecretoService {
  private readonly http = inject(HttpClient);

  createGroup(payload: { title: string; suggested_price: string }): Observable<GroupView> {
    return this.http
      .post<GroupView>('/api/groups', payload)
      .pipe(catchError(this.handleError));
  }

  getGroup(codeOrToken: string, adminToken?: string | null): Observable<GroupView> {
    const clean = encodeURIComponent(codeOrToken.trim());
    const query = adminToken ? `?admin=${encodeURIComponent(adminToken.trim())}` : '';
    return this.http
      .get<GroupView>(`/api/groups/${clean}${query}`)
      .pipe(catchError(this.handleError));
  }

  joinGroup(
    inviteCode: string,
    payload: { name: string; pin?: string | null; wishlist: string[] }
  ): Observable<Participant> {
    const clean = encodeURIComponent(inviteCode.trim());
    return this.http
      .post<Participant>(`/api/groups/${clean}/join`, payload)
      .pipe(catchError(this.handleError));
  }

  updateWishlist(
    participantId: string,
    payload: { wishlist: string[]; pin?: string | null }
  ): Observable<Participant> {
    const clean = encodeURIComponent(participantId.trim());
    return this.http
      .put<Participant>(`/api/participants/${clean}/wishlist`, payload)
      .pipe(catchError(this.handleError));
  }

  performDraw(
    inviteCode: string,
    payload: { admin_token: string; force_redraw?: boolean }
  ): Observable<GroupView> {
    const clean = encodeURIComponent(inviteCode.trim());
    return this.http
      .post<GroupView>(`/api/groups/${clean}/draw`, payload)
      .pipe(catchError(this.handleError));
  }

  revealTarget(participantId: string, pin?: string | null): Observable<RevealResult> {
    const clean = encodeURIComponent(participantId.trim());
    return this.http
      .post<RevealResult>(`/api/participants/${clean}/reveal`, { pin: pin || null })
      .pipe(catchError(this.handleError));
  }

  // LocalStorage helpers for "Continuar como [Nome]"
  saveParticipantForGroup(memory: SavedParticipantMemory): void {
    try {
      const key = `${PARTICIPANT_STORAGE_PREFIX}${memory.inviteCode.toUpperCase()}`;
      localStorage.setItem(key, JSON.stringify(memory));

      const recent = this.getRecentParticipants().filter(
        (item) => item.inviteCode.toUpperCase() !== memory.inviteCode.toUpperCase()
      );
      recent.unshift(memory);
      localStorage.setItem(RECENT_GROUPS_KEY, JSON.stringify(recent.slice(0, 10)));
    } catch {
      // Ignore storage quota errors
    }
  }

  getSavedParticipantForGroup(inviteCode: string): SavedParticipantMemory | null {
    try {
      const key = `${PARTICIPANT_STORAGE_PREFIX}${inviteCode.toUpperCase()}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as SavedParticipantMemory;
    } catch {
      return null;
    }
  }

  clearSavedParticipantForGroup(inviteCode: string): void {
    try {
      const key = `${PARTICIPANT_STORAGE_PREFIX}${inviteCode.toUpperCase()}`;
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }

  getRecentParticipants(): SavedParticipantMemory[] {
    try {
      const raw = localStorage.getItem(RECENT_GROUPS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedParticipantMemory[];
    } catch {
      return [];
    }
  }

  saveAdminGroup(group: GroupView): void {
    if (!group.admin_token) return;
    try {
      const list = this.getSavedAdminGroups().filter((g) => g.inviteCode !== group.invite_code);
      const item: SavedAdminGroupMemory = {
        groupId: group.id,
        title: group.title,
        suggestedPrice: group.suggested_price,
        inviteCode: group.invite_code,
        adminToken: group.admin_token,
        createdAt: group.created_at,
      };
      list.unshift(item);
      localStorage.setItem(ADMIN_GROUPS_KEY, JSON.stringify(list.slice(0, 10)));
    } catch {
      // Ignore
    }
  }

  getSavedAdminGroups(): SavedAdminGroupMemory[] {
    try {
      const raw = localStorage.getItem(ADMIN_GROUPS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedAdminGroupMemory[];
    } catch {
      return [];
    }
  }

  getSavedAdminTokenForGroup(inviteCode: string): string | null {
    const found = this.getSavedAdminGroups().find(
      (g) => g.inviteCode.toUpperCase() === inviteCode.toUpperCase()
    );
    return found ? found.adminToken : null;
  }

  buildInviteUrl(inviteCode: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/g/${inviteCode.toUpperCase()}`;
  }

  buildAdminUrl(inviteCode: string, adminToken: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/g/${inviteCode.toUpperCase()}?admin=${encodeURIComponent(adminToken)}`;
  }

  buildWhatsAppShareUrl(group: {
    title: string;
    suggested_price: string;
    invite_code: string;
  }): string {
    const link = this.buildInviteUrl(group.invite_code);
    const message =
      `🎁 *${group.title}*\n\n` +
      `Olá! Você foi convidado(a) para o nosso Amigo Secreto.\n` +
      `💰 *Valor sugerido do presente:* ${group.suggested_price}\n\n` +
      `👉 *Toque no link abaixo para colocar seu nome e o que gostaria de ganhar:*\n` +
      `${link}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  private handleError(error: HttpErrorResponse) {
    const serverMessage =
      error.error && typeof error.error === 'object' && 'error' in error.error
        ? String(error.error.error)
        : null;
    const friendlyMessage =
      serverMessage ||
      'Ocorreu um problema de conexão. Verifique sua internet e tente novamente.';
    return throwError(() => new Error(friendlyMessage));
  }
}
