import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, type Condition } from './evaluator';

describe('Rule Evaluator', () => {
  describe('eq operator', () => {
    it('should match exact equality', () => {
      const condition: Condition = { field: 'status', operator: 'eq', value: 'active' };
      assert.strictEqual(evaluate(condition, { status: 'active' }), true);
    });

    it('should not match different values', () => {
      const condition: Condition = { field: 'status', operator: 'eq', value: 'active' };
      assert.strictEqual(evaluate(condition, { status: 'inactive' }), false);
    });

    it('should handle number equality', () => {
      const condition: Condition = { field: 'count', operator: 'eq', value: 42 };
      assert.strictEqual(evaluate(condition, { count: 42 }), true);
      assert.strictEqual(evaluate(condition, { count: 43 }), false);
    });

    it('should match null values', () => {
      const condition: Condition = { field: 'data', operator: 'eq', value: null };
      assert.strictEqual(evaluate(condition, { data: null }), true);
    });
  });

  describe('neq operator', () => {
    it('should match inequality', () => {
      const condition: Condition = { field: 'status', operator: 'neq', value: 'active' };
      assert.strictEqual(evaluate(condition, { status: 'inactive' }), true);
    });

    it('should not match equal values', () => {
      const condition: Condition = { field: 'status', operator: 'neq', value: 'active' };
      assert.strictEqual(evaluate(condition, { status: 'active' }), false);
    });
  });

  describe('numeric comparisons (gt, gte, lt, lte)', () => {
    it('should handle gt (greater than)', () => {
      const condition: Condition = { field: 'amount', operator: 'gt', value: 100 };
      assert.strictEqual(evaluate(condition, { amount: 150 }), true);
      assert.strictEqual(evaluate(condition, { amount: 100 }), false);
      assert.strictEqual(evaluate(condition, { amount: 50 }), false);
    });

    it('should handle gte (greater than or equal)', () => {
      const condition: Condition = { field: 'amount', operator: 'gte', value: 100 };
      assert.strictEqual(evaluate(condition, { amount: 100 }), true);
      assert.strictEqual(evaluate(condition, { amount: 150 }), true);
      assert.strictEqual(evaluate(condition, { amount: 50 }), false);
    });

    it('should handle lt (less than)', () => {
      const condition: Condition = { field: 'amount', operator: 'lt', value: 100 };
      assert.strictEqual(evaluate(condition, { amount: 50 }), true);
      assert.strictEqual(evaluate(condition, { amount: 100 }), false);
    });

    it('should handle lte (less than or equal)', () => {
      const condition: Condition = { field: 'amount', operator: 'lte', value: 100 };
      assert.strictEqual(evaluate(condition, { amount: 100 }), true);
      assert.strictEqual(evaluate(condition, { amount: 50 }), true);
      assert.strictEqual(evaluate(condition, { amount: 150 }), false);
    });

    it('should cast string numbers to Numbers', () => {
      const condition: Condition = { field: 'amount', operator: 'gt', value: 100 };
      assert.strictEqual(evaluate(condition, { amount: '150' }), true);
      assert.strictEqual(evaluate(condition, { amount: '50' }), false);
    });

    it('should handle NaN gracefully', () => {
      const condition: Condition = { field: 'amount', operator: 'gt', value: 100 };
      const result = evaluate(condition, { amount: 'not-a-number' });
      assert.strictEqual(result, false);
    });
  });

  describe('in operator', () => {
    it('should check if value is in array', () => {
      const condition: Condition = { field: 'status', operator: 'in', value: ['active', 'pending'] };
      assert.strictEqual(evaluate(condition, { status: 'active' }), true);
      assert.strictEqual(evaluate(condition, { status: 'pending' }), true);
      assert.strictEqual(evaluate(condition, { status: 'inactive' }), false);
    });

    it('should throw if value is not an array', () => {
      const condition: Condition = { field: 'status', operator: 'in', value: 'active' };
      assert.throws(() => evaluate(condition, { status: 'active' }), /in operator requires value to be an array/);
    });
  });

  describe('contains operator', () => {
    it('should check if string contains substring', () => {
      const condition: Condition = { field: 'message', operator: 'contains', value: 'error' };
      assert.strictEqual(evaluate(condition, { message: 'An error occurred' }), true);
      assert.strictEqual(evaluate(condition, { message: 'Success' }), false);
    });

    it('should check if array contains value', () => {
      const condition: Condition = { field: 'tags', operator: 'contains', value: 'urgent' };
      assert.strictEqual(evaluate(condition, { tags: ['urgent', 'critical'] }), true);
      assert.strictEqual(evaluate(condition, { tags: ['low', 'medium'] }), false);
    });

    it('should return false for type mismatches', () => {
      const condition: Condition = { field: 'value', operator: 'contains', value: 'test' };
      assert.strictEqual(evaluate(condition, { value: 123 }), false);
    });
  });

  describe('startsWith and endsWith operators', () => {
    it('should check startsWith', () => {
      const condition: Condition = { field: 'email', operator: 'startsWith', value: 'admin' };
      assert.strictEqual(evaluate(condition, { email: 'admin@example.com' }), true);
      assert.strictEqual(evaluate(condition, { email: 'user@example.com' }), false);
    });

    it('should check endsWith', () => {
      const condition: Condition = { field: 'email', operator: 'endsWith', value: '@example.com' };
      assert.strictEqual(evaluate(condition, { email: 'user@example.com' }), true);
      assert.strictEqual(evaluate(condition, { email: 'user@other.com' }), false);
    });

    it('should return false for non-string fields', () => {
      const condition: Condition = { field: 'count', operator: 'startsWith', value: '10' };
      assert.strictEqual(evaluate(condition, { count: 100 }), false);
    });
  });

  describe('exists operator', () => {
    it('should return true if field exists and is not null', () => {
      const condition: Condition = { field: 'name', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, { name: 'John' }), true);
    });

    it('should return false if field is null', () => {
      const condition: Condition = { field: 'name', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, { name: null }), false);
    });

    it('should return false if field is undefined', () => {
      const condition: Condition = { field: 'name', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, {}), false);
    });

    it('should return true for false or 0 values', () => {
      const condition: Condition = { field: 'active', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, { active: false }), true);
      const zeroCondition: Condition = { field: 'count', operator: 'exists', value: null };
      assert.strictEqual(evaluate(zeroCondition, { count: 0 }), true);
    });
  });

  describe('regex operator', () => {
    it('should match regex pattern', () => {
      const condition: Condition = { field: 'email', operator: 'regex', value: '^[a-z]+@[a-z]+\\.[a-z]+$' };
      assert.strictEqual(evaluate(condition, { email: 'user@example.com' }), true);
      assert.strictEqual(evaluate(condition, { email: 'invalid-email' }), false);
    });

    it('should return false for non-string fields', () => {
      const condition: Condition = { field: 'count', operator: 'regex', value: '\\d+' };
      assert.strictEqual(evaluate(condition, { count: 123 }), false);
    });

    it('should throw for invalid regex pattern', () => {
      const condition: Condition = { field: 'text', operator: 'regex', value: '[invalid(' };
      assert.throws(() => evaluate(condition, { text: 'test' }), /Invalid regex pattern/);
    });
  });

  describe('dot notation (nested paths)', () => {
    it('should resolve nested object paths', () => {
      const condition: Condition = { field: 'order.amount', operator: 'gt', value: 100 };
      assert.strictEqual(evaluate(condition, { order: { amount: 150 } }), true);
      assert.strictEqual(evaluate(condition, { order: { amount: 50 } }), false);
    });

    it('should resolve deeply nested paths', () => {
      const condition: Condition = { field: 'customer.address.city', operator: 'eq', value: 'NYC' };
      assert.strictEqual(evaluate(condition, { customer: { address: { city: 'NYC' } } }), true);
      assert.strictEqual(evaluate(condition, { customer: { address: { city: 'LA' } } }), false);
    });

    it('should return undefined for missing intermediate paths', () => {
      const condition: Condition = { field: 'order.amount', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, { order: null }), false);
    });

    it('should handle partial paths gracefully', () => {
      const condition: Condition = { field: 'order.items.0.price', operator: 'eq', value: 50 };
      const payload = { order: { items: [{ price: 50 }] } };
      assert.strictEqual(evaluate(condition, payload), true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty payload', () => {
      const condition: Condition = { field: 'name', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, {}), false);
    });

    it('should throw on missing field in condition', () => {
      const condition = { operator: 'eq', value: 'test' } as unknown as Condition;
      assert.throws(() => evaluate(condition, { field: 'test' }));
    });

    it('should throw on missing operator in condition', () => {
      const condition = { field: 'name', value: 'test' } as unknown as Condition;
      assert.throws(() => evaluate(condition, { name: 'test' }));
    });

    it('should throw on unknown operator', () => {
      const condition: Condition = { field: 'name', operator: 'magic', value: 'test' };
      assert.throws(() => evaluate(condition, { name: 'test' }), /Unknown operator: magic/);
    });

    it('should handle boolean values', () => {
      const condition: Condition = { field: 'active', operator: 'eq', value: true };
      assert.strictEqual(evaluate(condition, { active: true }), true);
      assert.strictEqual(evaluate(condition, { active: false }), false);
    });

    it('should handle array fields with exists', () => {
      const condition: Condition = { field: 'items', operator: 'exists', value: null };
      assert.strictEqual(evaluate(condition, { items: [] }), true);
      assert.strictEqual(evaluate(condition, { items: [1, 2, 3] }), true);
    });
  });
});
