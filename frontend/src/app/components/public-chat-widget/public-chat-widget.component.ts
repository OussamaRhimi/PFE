import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateService } from '../../services/candidate.service';
import { I18nService } from '../../services/i18n.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-public-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-widget" [class.open]="open">
      <button class="chat-toggle" type="button" (click)="toggle()">
        <span *ngIf="!open">{{ i18n.t('chat.help') }}</span>
        <span *ngIf="open">{{ i18n.t('chat.close') }}</span>
      </button>

      <div class="chat-panel" *ngIf="open">
        <div class="chat-header">
          <div class="chat-title">{{ i18n.t('chat.title') }}</div>
          <button class="chat-clear" type="button" (click)="clear()">{{ i18n.t('chat.clear') }}</button>
        </div>

        <div class="chat-body">
          <div class="chat-msg" *ngFor="let msg of messages" [class.user]="msg.role === 'user'">
            <div class="bubble">{{ msg.content }}</div>
          </div>
          <div class="chat-msg" *ngIf="loading">
            <div class="bubble">{{ i18n.t('chat.typing') }}</div>
          </div>
        </div>

        <form class="chat-input" (ngSubmit)="send()">
          <input
            type="text"
            [(ngModel)]="draft"
            name="draft"
            [placeholder]="i18n.t('chat.placeholder')"
            [disabled]="loading"
          />
          <button type="submit" [disabled]="loading || !draft.trim()">{{ i18n.t('chat.send') }}</button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      $logo-red: #8b1f1f;
      $logo-red-deep: #791212;
      $gray-100: #f1f3f7;
      $gray-200: #e5e8ef;
      $gray-400: #9aa0b4;
      $gray-700: #3d4358;
      $gray-800: #252b3b;

      .chat-widget {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 1200;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
      }
      .chat-toggle {
        border: none;
        border-radius: 999px;
        padding: 10px 16px;
        background: linear-gradient(135deg, $logo-red-deep, $logo-red);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      }
      .chat-panel {
        width: min(360px, calc(100vw - 32px));
        background: #fff;
        border: 1px solid $gray-200;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.18);
        overflow: hidden;
      }
      .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid $gray-200;
        background: $gray-100;
      }
      .chat-title {
        font-size: 13px;
        font-weight: 700;
        color: $gray-800;
      }
      .chat-clear {
        border: none;
        background: transparent;
        font-size: 12px;
        color: $gray-400;
        cursor: pointer;
      }
      .chat-body {
        max-height: 320px;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .chat-msg {
        display: flex;
        justify-content: flex-start;
      }
      .chat-msg.user {
        justify-content: flex-end;
      }
      .bubble {
        max-width: 80%;
        padding: 8px 12px;
        border-radius: 14px;
        background: $gray-100;
        color: $gray-700;
        font-size: 12.5px;
        line-height: 1.4;
      }
      .chat-msg.user .bubble {
        background: rgba($logo-red, 0.12);
        color: $logo-red-deep;
      }
      .chat-input {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid $gray-200;
      }
      .chat-input input {
        flex: 1;
        border: 1px solid $gray-200;
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12.5px;
      }
      .chat-input button {
        border: none;
        background: $logo-red-deep;
        color: #fff;
        padding: 8px 12px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }
    `,
  ],
})
export class PublicChatWidgetComponent {
  open = false;
  loading = false;
  draft = '';
  messages: ChatMessage[] = [];

  constructor(private candidateService: CandidateService, public i18n: I18nService) {
    this.resetMessages();
  }

  toggle(): void {
    this.open = !this.open;
  }

  clear(): void {
    this.resetMessages();
  }

  private resetMessages(): void {
    this.messages = [
      { role: 'assistant', content: this.i18n.t('chat.greeting') },
    ];
  }

  send(): void {
    const content = this.draft.trim();
    if (!content || this.loading) return;

    this.messages = [...this.messages, { role: 'user', content }];
    this.draft = '';
    this.loading = true;

    const history = this.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
    this.candidateService.publicChat(history).subscribe({
      next: (res) => {
        const reply = typeof res?.reply === 'string' ? res.reply.trim() : '';
        if (reply) {
          this.messages = [...this.messages, { role: 'assistant', content: reply }];
        }
        this.loading = false;
      },
      error: () => {
        this.messages = [...this.messages, { role: 'assistant', content: this.i18n.t('chat.unavailable') }];
        this.loading = false;
      },
    });
  }
}
