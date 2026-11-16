import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prepareClientInput } from './clientInput';
import { DomainError } from './errors';
import { addCalendarDays, parseUserDate } from './dates';
import { buildMorningDigest, isDigestStillAhead } from './morningDigest';
import { effectiveStatus } from './taskStatus';
import {
  buildPartnershipTask,
  buildPurchaseTasks,
  courseEndsOn,
  shouldCancelPartnershipWindow,
  shouldSchedulePartnershipWindow,
} from './touchPlan';

const PURCHASED_ON = '2026-11-02';

function ids() {
  let n = 0;
  return () => `task-${++n}`;
}

function plan(durationDays: number) {
  return buildPurchaseTasks({
    purchaseId: 'pur-1',
    clientId: 'cli-1',
    product: { name: 'Serum X', durationDays },
    purchasedOn: PURCHASED_ON,
    createId: ids(),
  });
}

describe('calendar dates', () => {
  it('keeps the calendar day and does not parse the date as UTC', () => {
    assert.equal(addCalendarDays('2026-11-02', 0), '2026-11-02');
    assert.equal(addCalendarDays('2026-10-31', 3), '2026-11-03');
    assert.equal(addCalendarDays('2024-02-27', 2), '2024-02-29');
    assert.equal(addCalendarDays('2024-02-27', 3), '2024-03-01');
  });

  it('accepts a Russian date and rejects impossible days', () => {
    assert.equal(parseUserDate('02.11.2026'), '2026-11-02');
    assert.throws(() => parseUserDate('31.02.2026'), DomainError);
    assert.throws(() => addCalendarDays('2026-11-02T00:00:00Z', 1), DomainError);
  });
});

describe('purchase touch plan', () => {
  it('builds the 0-3-7-15 cascade and a reorder 4 days before the course ends', () => {
    const tasks = plan(28);
    const byType = Object.fromEntries(tasks.map((task) => [task.type, task]));

    assert.equal(tasks.length, 5);
    assert.deepEqual(
      tasks.map((task) => task.touchOn),
      ['2026-11-02', '2026-11-05', '2026-11-09', '2026-11-17', '2026-11-26'],
    );
    assert.equal(courseEndsOn(PURCHASED_ON, 28), '2026-11-30');

    assert.equal(
      byType.service_usage?.title,
      'Сервис: Объяснить, как пользоваться продуктом и как его хранить',
    );
    assert.equal(
      byType.control_checkin?.title,
      'Контроль: Уточнить впечатление от продукта и ответить на вопросы',
    );
    assert.equal(
      byType.result_checkpoint?.title,
      'Результат: Спросить об эффекте или обратной связи',
    );
    assert.equal(
      byType.cross_sell?.title,
      'Кросс-селл: Предложить дополнительный продукт из вашего каталога',
    );
    assert.equal(byType.reorder_reminder?.title, 'Напомнить о заказе, продукт скоро закончится');

    assert.equal(byType.service_usage?.category, 'service');
    assert.equal(byType.control_checkin?.category, 'service');
    assert.equal(byType.result_checkpoint?.category, 'service');
    assert.equal(byType.cross_sell?.category, 'upsell');
    assert.equal(byType.reorder_reminder?.category, 'upsell');
    assert.equal(byType.cross_sell?.details.includes('каталога'), true);
    assert.equal(tasks.every((task) => task.status === 'pending'), true);
    assert.equal(tasks.some((task) => task.type === 'partnership_offer'), false);
    assert.deepEqual(
      tasks.map((task) => task.dedupeKey),
      [
        'purchase:pur-1:service_usage',
        'purchase:pur-1:control_checkin',
        'purchase:pur-1:result_checkpoint',
        'purchase:pur-1:cross_sell',
        'purchase:pur-1:reorder_reminder',
      ],
    );
  });

  it('keeps day 15 for a course that ends earlier and sorts a reorder that lands between touches', () => {
    const tasks = buildPurchaseTasks({
      purchaseId: 'pur-short',
      clientId: 'cli-1',
      product: { name: 'Mini set', durationDays: 14 },
      purchasedOn: PURCHASED_ON,
      createId: ids(),
    });

    assert.deepEqual(
      tasks.map((task) => `${task.touchOn}:${task.type}`),
      [
        '2026-11-02:service_usage',
        '2026-11-05:control_checkin',
        '2026-11-09:result_checkpoint',
        '2026-11-12:reorder_reminder',
        '2026-11-17:cross_sell',
      ],
    );
    assert.equal(tasks.find((task) => task.type === 'cross_sell')?.details.includes('каталога'), true);
  });

  it('places a reorder on the purchase day when the course is shorter than 4 days', () => {
    const tasks = plan(3);
    const sameDay = tasks.filter((task) => task.touchOn === PURCHASED_ON);
    assert.deepEqual(
      sameDay.map((task) => task.type),
      ['service_usage', 'reorder_reminder'],
    );
  });

  it('keeps both the cross-sell and the reorder when they fall on one day', () => {
    const tasks = plan(19);
    const onDay15 = tasks.filter((task) => task.touchOn === '2026-11-17');
    assert.deepEqual(
      onDay15.map((task) => task.type),
      ['cross_sell', 'reorder_reminder'],
    );
  });

  it('rejects a course without a positive whole duration', () => {
    assert.throws(() => plan(0), DomainError);
    assert.throws(() => plan(1.5), DomainError);
  });
});

describe('partnership window', () => {
  it('starts only when the status changes to regular and lands 21 days later', () => {
    assert.equal(shouldSchedulePartnershipWindow('newbie', 'regular'), true);
    assert.equal(shouldSchedulePartnershipWindow('candidate', 'regular'), true);
    assert.equal(shouldSchedulePartnershipWindow('partner', 'regular'), true);
    assert.equal(shouldSchedulePartnershipWindow('regular', 'regular'), false);
    assert.equal(shouldSchedulePartnershipWindow('newbie', 'candidate'), false);
    assert.equal(shouldSchedulePartnershipWindow('regular', 'partner'), false);

    assert.equal(shouldCancelPartnershipWindow('regular', 'newbie'), true);
    assert.equal(shouldCancelPartnershipWindow('regular', 'candidate'), true);
    assert.equal(shouldCancelPartnershipWindow('regular', 'partner'), true);
    assert.equal(shouldCancelPartnershipWindow('newbie', 'regular'), false);
    assert.equal(shouldCancelPartnershipWindow('regular', 'regular'), false);

    const task = buildPartnershipTask({
      clientId: 'cli-1',
      changedOn: PURCHASED_ON,
      createId: () => 'partnership-1',
    });
    assert.equal(task.touchOn, '2026-11-23');
    assert.equal(task.category, 'partnership');
    assert.equal(task.title, 'Окно партнерства: Сделать бизнес-предложение');
    assert.equal(task.purchaseId, null);
    assert.equal(task.dedupeKey, 'client:cli-1:partnership_offer:2026-11-02');
  });
});

describe('task status and morning digest', () => {
  it('derives overdue from the calendar day and keeps a completed touch completed', () => {
    assert.equal(effectiveStatus('pending', '2026-11-01', '2026-11-02'), 'overdue');
    assert.equal(effectiveStatus('pending', '2026-11-02', '2026-11-02'), 'pending');
    assert.equal(effectiveStatus('pending', '2026-11-03', '2026-11-02'), 'pending');
    assert.equal(effectiveStatus('done', '2026-11-01', '2026-11-02'), 'done');
    assert.equal(effectiveStatus('overdue', '2026-11-03', '2026-11-02'), 'pending');
  });

  it('builds a morning plan and skips a digest whose time has passed', () => {
    const digest = buildMorningDigest('2026-11-02', [
      { clientName: 'Анна', title: 'Сервис: Объяснить', category: 'service', productName: 'Serum X' },
    ]);
    assert.equal(digest?.title, 'Касания на 2 ноября 2026');
    assert.equal(digest?.body.includes('Анна, Serum X: Сервис: Объяснить'), true);
    assert.equal(buildMorningDigest('2026-11-02', []), null);

    const beforeNine = new Date(2026, 10, 2, 8, 59, 0, 0);
    const atNine = new Date(2026, 10, 2, 9, 0, 0, 0);
    assert.equal(isDigestStillAhead('2026-11-02', beforeNine), true);
    assert.equal(isDigestStillAhead('2026-11-02', atNine), false);
  });

  it('requires a client name', () => {
    assert.throws(() => prepareClientInput({
      name: '   ',
      phone: '',
      status: 'newbie',
    }), DomainError);
  });
});
