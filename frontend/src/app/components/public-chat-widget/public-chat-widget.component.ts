import { AfterViewInit, Component, HostListener } from '@angular/core';
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
    <div class="chat-widget" [class.open]="open" [style.bottom.px]="20 + footerOffset">
      <button class="chat-toggle" type="button" (click)="toggle()">
        <span class="toggle-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a5 5 0 00-5 5v3H6a3 3 0 00-3 3v2a3 3 0 003 3h2l1 3h6l1-3h2a3 3 0 003-3v-2a3 3 0 00-3-3h-1V7a5 5 0 00-5-5z"/>
            <circle cx="9" cy="12" r="1"/>
            <circle cx="15" cy="12" r="1"/>
          </svg>
        </span>
        <span class="toggle-text">
          <span class="toggle-title">AI</span>
          <span class="toggle-label" *ngIf="!open">{{ i18n.t('chat.help') }}</span>
          <span class="toggle-label" *ngIf="open">{{ i18n.t('chat.close') }}</span>
        </span>
      </button>

      <div class="chat-panel" *ngIf="open">
        <div class="chat-header">
          <div class="chat-brand">
            <span class="chat-brand-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a5 5 0 00-5 5v3H6a3 3 0 00-3 3v2a3 3 0 003 3h2l1 3h6l1-3h2a3 3 0 003-3v-2a3 3 0 00-3-3h-1V7a5 5 0 00-5-5z"/>
                <circle cx="9" cy="12" r="1"/>
                <circle cx="15" cy="12" r="1"/>
              </svg>
            </span>
            <div>
              <div class="chat-title">{{ i18n.t('chat.title') }}</div>
              <div class="chat-sub">AI assistant</div>
            </div>
          </div>
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
        z-index: 1200;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
      }
      .chat-toggle {
        border: none;
        border-radius: 999px;
        padding: 10px 14px 10px 10px;
        background: linear-gradient(135deg, $logo-red-deep, $logo-red);
        color: #fff;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        display: inline-flex;
        align-items: center;
        gap: 10px;
        letter-spacing: 0.02em;
      }
      .toggle-icon {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .toggle-text {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .toggle-title {
        font-size: 11px;
        text-transform: uppercase;
        opacity: 0.9;
      }
      .toggle-label {
        font-size: 12.5px;
        font-weight: 700;
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
        background: linear-gradient(180deg, $gray-100 0%, #fff 100%);
      }
      .chat-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .chat-brand-icon {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        background: rgba(139, 31, 31, 0.12);
        color: $logo-red-deep;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .chat-title {
        font-size: 13px;
        font-weight: 700;
        color: $gray-800;
      }
      .chat-sub {
        font-size: 11px;
        color: $gray-400;
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
        background: #fff;
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
export class PublicChatWidgetComponent implements AfterViewInit {
  open = false;
  loading = false;
  draft = '';
  messages: ChatMessage[] = [];
  footerOffset = 0;

  constructor(private candidateService: CandidateService, public i18n: I18nService) {
    this.resetMessages();
  }

  ngAfterViewInit(): void {
    this.updateFooterOffset();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    this.updateFooterOffset();
  }

  private updateFooterOffset(): void {
    const footers = Array.from(document.querySelectorAll('.page-footer')) as HTMLElement[];
    if (footers.length === 0) {
      this.footerOffset = 0;
      return;
    }
    let maxOffset = 0;
    for (const footer of footers) {
      const rect = footer.getBoundingClientRect();
      const overlap = Math.max(0, window.innerHeight - rect.top);
      const offset = Math.min(overlap, rect.height);
      if (offset > maxOffset) maxOffset = offset;
    }
    this.footerOffset = maxOffset;
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
