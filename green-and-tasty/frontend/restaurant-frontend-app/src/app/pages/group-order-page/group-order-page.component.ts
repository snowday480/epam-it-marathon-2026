import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subscription, forkJoin, timer } from 'rxjs';
import { catchError, exhaustMap, switchMap } from 'rxjs/operators';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { Participant } from '@app/models/group-orders/participant.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';

@Component({
  selector: 'app-group-order-page',
  imports: [CurrencyPipe, DatePipe, ParticipantCardComponent, ModalComponent],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly groupOrdersService = inject(GroupOrdersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private syncSub?: Subscription;

  readonly reservationId = this.route.snapshot.paramMap.get('reservationId') ?? 'demo-reservation';

  readonly loading = signal<boolean>(true);
  readonly error = signal<HttpErrorResponse | Error | null>(null);
  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly ownerSessionId = signal<string | null>(null);
  readonly status = signal<GroupReservationStatus>('Open');

  readonly lastUpdated = signal<Date | null>(null);
  readonly refreshFailed = signal<boolean>(false);

  readonly submitting = signal<boolean>(false);
  readonly isSubmitModalOpen = signal<boolean>(false);

  readonly guestToRemove = signal<Participant | null>(null);
  readonly removing = signal<boolean>(false);

  readonly consolidated = computed(() => consolidatePreOrder(this.participants()));

  readonly unsubmittedCount = computed(() => {
    return this.participants().filter((person) => !person.isSubmitted).length;
  });

  readonly unsubmittedBannerText = computed(() => {
    const count = this.unsubmittedCount();
    if (count === 0) {
      return null;
    }
    const word = count === 1 ? 'participant' : 'participants';
    const verb = count === 1 ? "hasn't" : "haven't";
    return `${count} ${word} ${verb} submitted their cart yet — their dishes won't be included in the order`;
  });

  readonly hasNoDishes = computed(() => {
    const people = this.participants();
    return people.length > 0 && people.every((person) => person.items.length === 0);
  });

  readonly isNotFoundError = computed(() => {
    const err = this.error();
    return (
      (err instanceof HttpErrorResponse && err.status === 404) ||
      (err !== null && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404)
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.refreshFailed.set(false);
    this.stopSync();

    this.groupOrdersService
      .getGroupInvite$(this.reservationId)
      .pipe(
        switchMap((inv) => {
          this.invite.set(inv);
          return forkJoin({
            ownerSessionId: this.groupOrdersService.getOwnerSessionId$(this.reservationId),
            sessions: this.groupOrdersService.getSessions$(inv.GroupReservationId),
            statusRes: this.groupOrdersService.getStatus$(inv.GroupReservationId),
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ ownerSessionId, sessions, statusRes }) => {
          this.ownerSessionId.set(ownerSessionId);
          this.participants.set(sessions.participants);
          this.status.set(statusRes.status);
          this.lastUpdated.set(new Date());
          this.loading.set(false);

          const inv = this.invite();
          if (inv && statusRes.status === 'Open') {
            this.startSync(inv.GroupReservationId);
          }
        },
        error: (err) => {
          this.error.set(err);
          this.loading.set(false);
        },
      });
  }

  private startSync(groupReservationId: string): void {
    this.stopSync();
    if (this.status() !== 'Open') {
      return;
    }

    this.syncSub = timer(15000, 15000)
      .pipe(
        exhaustMap(() =>
          forkJoin({
            sessions: this.groupOrdersService.getSessions$(groupReservationId, { silent: true }),
            statusRes: this.groupOrdersService.getStatus$(groupReservationId, { silent: true }),
          }).pipe(
            catchError(() => {
              this.refreshFailed.set(true);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ sessions, statusRes }) => {
          this.participants.set(sessions.participants);
          this.status.set(statusRes.status);
          this.lastUpdated.set(new Date());
          this.refreshFailed.set(false);

          if (statusRes.status !== 'Open') {
            this.stopSync();
          }
        },
      });
  }

  private stopSync(): void {
    if (this.syncSub) {
      this.syncSub.unsubscribe();
      this.syncSub = undefined;
    }
  }

  refreshNow(): void {
    const inv = this.invite();
    if (!inv) {
      return;
    }

    forkJoin({
      sessions: this.groupOrdersService.getSessions$(inv.GroupReservationId, { silent: true }),
      statusRes: this.groupOrdersService.getStatus$(inv.GroupReservationId, { silent: true }),
    })
      .pipe(
        catchError(() => {
          this.refreshFailed.set(true);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ sessions, statusRes }) => {
          this.participants.set(sessions.participants);
          this.status.set(statusRes.status);
          this.lastUpdated.set(new Date());
          this.refreshFailed.set(false);

          if (statusRes.status !== 'Open') {
            this.stopSync();
          }
        },
      });
  }

  openSubmitModal(): void {
    if (this.consolidated().items.length === 0 || this.status() !== 'Open' || this.submitting()) {
      return;
    }
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal(): void {
    if (this.submitting()) {
      return;
    }
    this.isSubmitModalOpen.set(false);
  }

  confirmSubmit(): void {
    if (this.submitting()) {
      return;
    }
    const inv = this.invite();
    if (!inv) {
      return;
    }

    this.submitting.set(true);
    this.groupOrdersService
      .submit$(inv.GroupReservationId, this.reservationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.isSubmitModalOpen.set(false);
          this.status.set('Submitted');
          this.stopSync();
          this.toastService.success('Pre-order sent to the restaurant');
        },
        error: () => {
          this.submitting.set(false);
          this.isSubmitModalOpen.set(false);
        },
      });
  }

  openRemoveGuestModal(guest: Participant): void {
    if (this.status() !== 'Open' || guest.type !== 'Guest') {
      return;
    }
    this.guestToRemove.set(guest);
  }

  closeRemoveGuestModal(): void {
    if (this.removing()) {
      return;
    }
    this.guestToRemove.set(null);
  }

  confirmRemoveGuest(): void {
    const guest = this.guestToRemove();
    const inv = this.invite();
    if (!guest || !inv || this.removing()) {
      return;
    }

    this.removing.set(true);
    this.groupOrdersService
      .removeSession$(inv.GroupReservationId, guest.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.participants.set(response.participants);
          this.removing.set(false);
          this.guestToRemove.set(null);
          this.toastService.success('Guest removed');
        },
        error: () => {
          this.removing.set(false);
          this.guestToRemove.set(null);
        },
      });
  }
}
