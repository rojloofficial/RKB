/**
 * High-Performance LRU (Least Recently Used) Cache with TTL support.
 * Implemented using a Hash Map (O(1) lookup) and a Doubly Linked List (O(1) eviction/insertion).
 * Time Complexity:
 *   - get(key): O(1)
 *   - set(key, value, ttlMs?): O(1)
 *   - delete(key): O(1)
 *   - clear(): O(1)
 * Space Complexity: O(capacity)
 */

interface LRUNode<K, V> {
  key: K;
  value: V;
  expiresAt: number | null;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly defaultTtlMs: number | null;
  private readonly map: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  constructor(capacity = 500, defaultTtlMs: number | null = null) {
    if (capacity <= 0) {
      throw new Error("LRUCache capacity must be greater than 0");
    }
    this.capacity = capacity;
    this.defaultTtlMs = defaultTtlMs;
    this.map = new Map<K, LRUNode<K, V>>();
  }

  public get size(): number {
    return this.map.size;
  }

  public get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) return null;

    // Check expiration
    if (node.expiresAt !== null && Date.now() > node.expiresAt) {
      this.removeNode(node);
      this.map.delete(key);
      return null;
    }

    // Move accessed node to head (most recently used)
    this.moveToHead(node);
    return node.value;
  }

  public set(key: K, value: V, ttlMs?: number): void {
    const existing = this.map.get(key);
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const expiresAt = effectiveTtl !== null ? Date.now() + effectiveTtl : null;

    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.moveToHead(existing);
      return;
    }

    // Evict oldest node if capacity exceeded
    if (this.map.size >= this.capacity && this.tail) {
      this.map.delete(this.tail.key);
      this.removeNode(this.tail);
    }

    const newNode: LRUNode<K, V> = {
      key,
      value,
      expiresAt,
      prev: null,
      next: null,
    };

    this.addToHead(newNode);
    this.map.set(key, newNode);
  }

  public has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (node.expiresAt !== null && Date.now() > node.expiresAt) {
      this.removeNode(node);
      this.map.delete(key);
      return false;
    }
    return true;
  }

  public delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    return this.map.delete(key);
  }

  public clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: LRUNode<K, V>): void {
    if (this.head === node) return;
    this.removeNode(node);
    this.addToHead(node);
  }
}
