
import {
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { finalize } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatResponse {
  reply?: string;
  totalTimeSeconds?: number;
  ollamaTimeSeconds?: number;
  error?: string;
  message?: string;
  details?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  @ViewChild('messagesEnd')
  messagesEnd?: ElementRef<HTMLDivElement>;

  question = '';
  loading = false;
  errorMessage = '';
  totalTimeSeconds: number | null = null;

  messages: ChatMessage[] = [];

  private readonly apiUrl = 'https://localhost:7153/api/Chat';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  sendMessage(): void {
    const text = this.question.trim();

    if (!text || this.loading) {
      return;
    }

    // Display the user's message immediately.
    this.messages.push({
      role: 'user',
      text: text
    });

    this.question = '';
    this.errorMessage = '';
    this.totalTimeSeconds = null;
    this.loading = true;

    this.cdr.detectChanges();
    this.scrollToBottom();

    this.http.post<ChatResponse>(
      this.apiUrl,
      { message: text }
    ).pipe(
      finalize(() => {
        // Always stop the loading indicator.
        this.loading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      })
    ).subscribe({
      next: (response) => {
        console.log('Full backend response:', response);

        const answer =
          typeof response?.reply === 'string'
            ? response.reply.trim()
            : '';

        if (answer.length > 0) {
          this.messages.push({
            role: 'assistant',
            text: answer
          });

          if (typeof response.totalTimeSeconds === 'number') {
            this.totalTimeSeconds = response.totalTimeSeconds;
          }

          this.errorMessage = '';
        } else {
          this.errorMessage =
            response?.error ||
            response?.message ||
            'The AI returned an empty response.';
        }

        this.cdr.detectChanges();
        this.scrollToBottom();
      },

      error: (error) => {
        console.error('Chat API error:', error);
        console.error('Error details:', error.error);

        this.errorMessage =
          error.error?.message ||
          error.error?.error ||
          `Request failed with status ${error.status}.`;

        this.cdr.detectChanges();
      }
    });
  }

  handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    // Shift + Enter creates a new line.
    if (keyboardEvent.shiftKey) {
      return;
    }

    // Enter sends the message without adding a new line.
    keyboardEvent.preventDefault();
    this.sendMessage();
  }

  clearChat(): void {
    if (this.loading) {
      return;
    }

    this.messages = [];
    this.errorMessage = '';
    this.totalTimeSeconds = null;

    this.cdr.detectChanges();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }, 50);
  }
}
