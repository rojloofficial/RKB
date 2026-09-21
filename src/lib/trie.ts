/**
 * Prefix Trie (Prefix Tree) Data Structure
 * Optimized for prefix matching and auto-complete in O(L) time,
 * where L is the length of the query string.
 *
 * Space Complexity: O(Total characters across all indexed keys)
 * Search Complexity: O(Prefix length + K matches)
 */

interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  isTerminal: boolean;
  values: Set<T>;
}

function createTrieNode<T>(): TrieNode<T> {
  return {
    children: new Map<string, TrieNode<T>>(),
    isTerminal: false,
    values: new Set<T>(),
  };
}

export class PrefixTrie<T> {
  private readonly root: TrieNode<T> = createTrieNode<T>();

  /**
   * Inserts a key and its associated value into the Trie.
   * Time Complexity: O(L) where L is length of word.
   */
  public insert(word: string, value: T): void {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return;

    let current = this.root;
    for (let i = 0; i < cleanWord.length; i++) {
      const char = cleanWord[i];
      let next = current.children.get(char);
      if (!next) {
        next = createTrieNode<T>();
        current.children.set(char, next);
      }
      current = next;
      // Index value at prefix node for fast bounded prefix retrieval
      current.values.add(value);
    }
    current.isTerminal = true;
  }

  /**
   * Finds all values matching the prefix in O(P + K) time.
   * P = prefix length, K = match count.
   */
  public searchPrefix(prefix: string, maxResults = 50): T[] {
    const cleanPrefix = prefix.trim().toLowerCase();
    if (!cleanPrefix) return [];

    let current = this.root;
    for (let i = 0; i < cleanPrefix.length; i++) {
      const char = cleanPrefix[i];
      const next = current.children.get(char);
      if (!next) return [];
      current = next;
    }

    const results: T[] = [];
    for (const val of current.values) {
      results.push(val);
      if (results.length >= maxResults) break;
    }
    return results;
  }

  /**
   * Checks if an exact word exists in the Trie.
   * Time Complexity: O(L)
   */
  public hasExact(word: string): boolean {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return false;

    let current = this.root;
    for (let i = 0; i < cleanWord.length; i++) {
      const next = current.children.get(cleanWord[i]);
      if (!next) return false;
      current = next;
    }
    return current.isTerminal;
  }
}
